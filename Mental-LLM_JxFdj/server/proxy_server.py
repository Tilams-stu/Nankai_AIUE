from __future__ import annotations

import http.server
import hashlib
import json
import mimetypes
import os
import re
import socketserver
import threading
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib import error, request


mimetypes.add_type("model/gltf-binary", ".glb")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ROOT = PROJECT_ROOT / "public"
PORT = int(os.getenv("MENTAL_LLM_PORT", "8000"))
BASE_URL = os.getenv("NANKAI_BASE_URL", "https://coze.nankai.edu.cn/api/proxy/api/v1")
API_KEY_ENV = "NANKAI_API_KEY"
WORKFLOW_GATEWAY_MODE_ENV = "MENTAL_LLM_WORKFLOW_GATEWAY_MODE"
WORKFLOW_AUDIT_DIR_ENV = "MENTAL_LLM_WORKFLOW_AUDIT_DIR"
WORKFLOW_GATEWAY_URL_ENV = "MENTAL_LLM_WORKFLOW_GATEWAY_URL"
WORKFLOW_GATEWAY_TIMEOUT_ENV = "MENTAL_LLM_WORKFLOW_GATEWAY_TIMEOUT_SECONDS"
WORKFLOW_GATEWAY_AUTH_HEADER_ENV = "MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_HEADER"
WORKFLOW_GATEWAY_AUTH_SCHEME_ENV = "MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_SCHEME"
WORKFLOW_GATEWAY_AUTH_TOKEN_ENV = "MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_TOKEN"
AGENT_REPORT_WORKFLOW_NAME_ENV = "MENTAL_LLM_AGENT_REPORT_WORKFLOW_NAME"
CONVERSATION_MAP_FILE_ENV = "MENTAL_LLM_CONVERSATION_MAP_FILE"
CONVERSATION_MAP_RETENTION_ENV = "MENTAL_LLM_CONVERSATION_MAP_RETENTION_SECONDS"
CREATE_TIMEOUT_SECONDS = 10
STREAM_TIMEOUT_SECONDS = 60
WORKFLOW_GATEWAY_TIMEOUT_SECONDS = 20
AGENT_REPORT_WORKFLOW_NAME = os.getenv(
    AGENT_REPORT_WORKFLOW_NAME_ENV,
    "report-to-feishu-yhx",
).strip() or "report-to-feishu-yhx"

conversations: dict[tuple[str, str, str], str] = {}
conversation_mapping_lock = threading.Lock()


class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


def normalize_upstream_status(status_code: int) -> int:
    if status_code in {401, 403, 429}:
        return status_code
    if status_code >= 500:
        return 502
    return 502


def post_json(url: str, headers: dict[str, str], payload: dict, timeout: int) -> tuple[int, bytes]:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=body, headers=headers, method="POST")
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except error.HTTPError as exc:
        return exc.code, exc.read()


def get_workflow_gateway_mode() -> str:
    return os.getenv(WORKFLOW_GATEWAY_MODE_ENV, "agent_internal").strip() or "agent_internal"


def get_workflow_gateway_url() -> str:
    return os.getenv(WORKFLOW_GATEWAY_URL_ENV, "").strip()


def get_workflow_gateway_timeout_seconds() -> int:
    raw_value = os.getenv(WORKFLOW_GATEWAY_TIMEOUT_ENV, str(WORKFLOW_GATEWAY_TIMEOUT_SECONDS)).strip()
    try:
        return max(1, min(120, int(raw_value)))
    except ValueError:
        return WORKFLOW_GATEWAY_TIMEOUT_SECONDS


def get_workflow_gateway_target_origin() -> str | None:
    gateway_url = get_workflow_gateway_url()
    if not gateway_url:
        return None
    parsed = urlparse(gateway_url)
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def get_conversation_map_path() -> Path:
    configured = os.getenv(CONVERSATION_MAP_FILE_ENV, "").strip()
    if configured:
        candidate = Path(configured)
        return candidate if candidate.is_absolute() else (PROJECT_ROOT / candidate).resolve()
    return PROJECT_ROOT / "server" / "conversation_map.json"


def get_conversation_map_retention_seconds() -> int:
    raw_value = os.getenv(CONVERSATION_MAP_RETENTION_ENV, "86400").strip()
    try:
        return max(300, min(7 * 24 * 60 * 60, int(raw_value)))
    except ValueError:
        return 86400


def get_conversation_map_key(session_id: str, user_id: str, bot_id: str) -> str:
    source = "\x1f".join((session_id or "no_session", user_id, bot_id))
    return hashlib.sha256(source.encode("utf-8")).hexdigest()


def load_persisted_conversation(conversation_key: str) -> str | None:
    path = get_conversation_map_path()
    now = time.time()
    retention = get_conversation_map_retention_seconds()
    with conversation_mapping_lock:
        try:
            raw = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
        except Exception:
            raw = {}

        records = raw.get("records") if isinstance(raw, dict) and isinstance(raw.get("records"), dict) else {}
        active_records = {
            key: value
            for key, value in records.items()
            if isinstance(value, dict)
            and isinstance(value.get("conversationId"), str)
            and isinstance(value.get("updatedAtEpoch"), (int, float))
            and now - float(value["updatedAtEpoch"]) <= retention
        }
        if active_records != records:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps({"schemaVersion": "conversation_map_v1", "records": active_records}), encoding="utf-8")

        entry = active_records.get(conversation_key)
        return str(entry["conversationId"]) if isinstance(entry, dict) else None


def persist_conversation(conversation_key: str, conversation_id: str) -> None:
    path = get_conversation_map_path()
    with conversation_mapping_lock:
        try:
            raw = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
        except Exception:
            raw = {}
        records = raw.get("records") if isinstance(raw, dict) and isinstance(raw.get("records"), dict) else {}
        records[conversation_key] = {
            "conversationId": conversation_id,
            "updatedAtEpoch": time.time(),
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps({"schemaVersion": "conversation_map_v1", "records": records}, ensure_ascii=False),
            encoding="utf-8",
        )


def is_workflow_gateway_configured(mode: str) -> bool:
    if mode == "forward":
        return bool(get_workflow_gateway_url())
    return mode != "disabled"


def build_workflow_gateway_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    token = os.getenv(WORKFLOW_GATEWAY_AUTH_TOKEN_ENV, "").strip()
    if not token:
        return headers

    header_name = os.getenv(WORKFLOW_GATEWAY_AUTH_HEADER_ENV, "Authorization").strip() or "Authorization"
    scheme = os.getenv(WORKFLOW_GATEWAY_AUTH_SCHEME_ENV, "Bearer").strip()
    headers[header_name] = f"{scheme} {token}".strip() if scheme else token
    return headers


def try_parse_json_bytes(raw_body: bytes) -> object | None:
    if not raw_body:
        return None
    try:
        return json.loads(raw_body.decode("utf-8"))
    except Exception:
        return None


def extract_upstream_error_fields(raw_body: bytes) -> dict[str, object]:
    parsed = try_parse_json_bytes(raw_body)
    raw_text = raw_body.decode("utf-8", errors="replace") if raw_body else ""
    result: dict[str, object] = {
        "raw_text": raw_text,
        "upstream_code": None,
        "upstream_message": raw_text,
        "model_ids": [],
    }

    if isinstance(parsed, dict):
        response_metadata = parsed.get("ResponseMetadata")
        if isinstance(response_metadata, dict):
            upstream_error = response_metadata.get("Error")
            if isinstance(upstream_error, dict):
                code = upstream_error.get("Code")
                message = upstream_error.get("Message")
                if isinstance(code, str):
                    result["upstream_code"] = code
                if isinstance(message, str) and message.strip():
                    result["upstream_message"] = message

    model_match = re.search(r'modelIDs:\[(.*?)\]', str(result["upstream_message"]))
    if model_match:
        inner = model_match.group(1)
        result["model_ids"] = re.findall(r'"([^"]+)"', inner)

    return result


def build_chat_upstream_error_payload(status_code: int, raw_body: bytes) -> dict:
    details = extract_upstream_error_fields(raw_body)
    upstream_message = str(details.get("upstream_message") or "")
    upstream_code = details.get("upstream_code")
    model_ids = details.get("model_ids") if isinstance(details.get("model_ids"), list) else []

    if "model no permission" in upstream_message.lower():
        return {
            "content": "当前智能体绑定的模型没有权限，请联系维护者检查 NK-GeniOS 模型配置后重试。",
            "message": "当前智能体绑定的模型没有权限，请联系维护者检查 NK-GeniOS 模型配置后重试。",
            "error": {
                "status": status_code,
                "code": "upstream_model_no_permission",
                "upstream_code": upstream_code,
                "upstream_message": upstream_message,
                "model_ids": model_ids,
            },
        }

    return {
        "content": "Service temporarily unavailable.",
        "message": "Service temporarily unavailable.",
        "error": {
            "status": status_code,
            "code": "upstream_chat_query_failed",
            "upstream_code": upstream_code,
            "upstream_message": upstream_message,
        },
    }


def get_workflow_audit_root() -> Path:
    configured = os.getenv(WORKFLOW_AUDIT_DIR_ENV, "").strip()
    if configured:
        candidate = Path(configured)
        if not candidate.is_absolute():
            candidate = (PROJECT_ROOT / candidate).resolve()
        return candidate
    return PROJECT_ROOT / "server" / "workflow_audit"


def to_project_relative_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(PROJECT_ROOT.resolve()))
    except ValueError:
        return str(path.resolve())


def write_workflow_audit_record(request_id: str, body: dict, mode: str) -> Path:
    audit_root = get_workflow_audit_root()
    audit_root.mkdir(parents=True, exist_ok=True)
    timestamp = time.strftime("%Y%m%dT%H%M%S", time.localtime())
    record_path = audit_root / f"{timestamp}_{request_id}.json"
    payload_hash = hashlib.sha256(json.dumps(body, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()
    session_snapshot = body.get("session_snapshot") if isinstance(body.get("session_snapshot"), dict) else {}
    session_id = str(
        session_snapshot.get("state", {}).get("session", {}).get("id", "")
        if isinstance(session_snapshot.get("state"), dict)
        and isinstance(session_snapshot.get("state", {}).get("session"), dict)
        else ""
    )
    payload = {
        "schemaVersion": "workflow_gateway_audit_v1",
        "createdAtIso": time.strftime("%Y-%m-%dT%H:%M:%S%z", time.localtime()),
        "workflow": AGENT_REPORT_WORKFLOW_NAME,
        "mode": mode,
        "request": body,
        "summary": {
            "severity": body.get("SEVERITY_LEVEL"),
            "studentIdSuffix": str(body.get("Student_ID", ""))[-4:],
            "markdownLength": len(str(body.get("input", ""))),
            "payloadHash": payload_hash,
            "sessionId": session_id or None,
            "snapshotReceived": isinstance(body.get("session_snapshot"), dict),
            "snapshotSchemaVersion": (
                str(body["session_snapshot"].get("schemaVersion"))
                if isinstance(body.get("session_snapshot"), dict)
                and isinstance(body["session_snapshot"].get("schemaVersion"), str)
                else None
            ),
        },
    }
    record_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return record_path


def read_workflow_audit_summaries(limit: int) -> list[dict]:
    audit_root = get_workflow_audit_root()
    if not audit_root.exists():
        return []

    records: list[dict] = []
    for record_path in sorted(audit_root.glob("*.json"), reverse=True)[:limit]:
        try:
            payload = json.loads(record_path.read_text(encoding="utf-8"))
        except Exception:
            continue

        summary = payload.get("summary") if isinstance(payload.get("summary"), dict) else {}
        records.append(
            {
                "schemaVersion": str(payload.get("schemaVersion") or ""),
                "createdAtIso": str(payload.get("createdAtIso") or ""),
                "workflow": str(payload.get("workflow") or ""),
                "mode": str(payload.get("mode") or ""),
                "auditRecordPath": to_project_relative_path(record_path),
                "severity": summary.get("severity"),
                "studentIdSuffix": summary.get("studentIdSuffix"),
                "markdownLength": summary.get("markdownLength"),
                "payloadHash": summary.get("payloadHash"),
                "sessionId": summary.get("sessionId"),
                "snapshotReceived": summary.get("snapshotReceived"),
                "snapshotSchemaVersion": summary.get("snapshotSchemaVersion"),
            }
        )
    return records


class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PROJECT_ROOT), **kwargs)

    def log_message(self, format, *args):
        return

    def translate_path(self, path: str) -> str:
        requested_path = path.split("?", 1)[0].split("#", 1)[0].lstrip("/")
        if requested_path:
            public_candidate = (PUBLIC_ROOT / requested_path).resolve()
            try:
                public_candidate.relative_to(PUBLIC_ROOT.resolve())
            except ValueError:
                public_candidate = None
            if public_candidate and public_candidate.exists():
                return str(public_candidate)
        return super().translate_path(path)

    def send_json(self, status_code: int, payload: dict) -> None:
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def send_json_error(self, status_code: int, code: str) -> None:
        self.send_json(status_code, {"error": "Service temporarily unavailable.", "code": code})

    def write_sse(self, payload: dict) -> None:
        self.wfile.write(f"data: {json.dumps(payload, ensure_ascii=False)}\n\n".encode("utf-8"))
        self.wfile.flush()

    def do_POST(self):
        route = self.path.split("?", 1)[0]
        if route == "/api/workflow/report-to-feishu":
            self.handle_report_to_feishu_gateway()
            return
        if route != "/api/chat":
            super().do_POST()
            return

        started_at = time.perf_counter()
        request_id = str(int(started_at * 1000))

        try:
            body = self.read_json_body()
            bot_id = str(body.get("bot_id") or "").strip()
            if not bot_id:
                self.send_json_error(400, "missing_bot_id")
                print(f"chat request {request_id}: rejected status=400 reason=missing_bot_id")
                return

            api_key = os.getenv(API_KEY_ENV, "").strip()
            if not api_key:
                self.send_json_error(500, "missing_server_api_key")
                print(f"chat request {request_id}: rejected status=500 reason=missing_server_api_key")
                return

            user_id = str(body.get("user_id") or "guest")[:20]
            user_name = str(body.get("user_name") or "Student")
            query = self.extract_query(body)
            session_id = ""
            context_packet = body.get("local_context_packet")
            if isinstance(context_packet, dict):
                session_id = str(context_packet.get("sessionId") or "").strip()
            conversation_id = self.get_or_create_conversation(api_key, user_id, bot_id, session_id, request_id)
            if not conversation_id:
                return

            self.stream_chat(api_key, bot_id, user_id, user_name, query, conversation_id, request_id)
        except json.JSONDecodeError:
            self.send_json_error(400, "invalid_json")
            print(f"chat request {request_id}: rejected status=400 reason=invalid_json")
        except Exception as exc:
            self.send_json_error(500, "handler_error")
            print(f"chat request {request_id}: failed reason={type(exc).__name__}")
        finally:
            elapsed_ms = int((time.perf_counter() - started_at) * 1000)
            print(f"chat request {request_id}: completed elapsed_ms={elapsed_ms}")

    def do_GET(self):
        route = self.path.split("?", 1)[0]
        if route == "/api/workflow/status":
            mode = get_workflow_gateway_mode()
            self.send_json(
                200,
                {
                    "enabled": is_workflow_gateway_configured(mode),
                    "mode": mode,
                    "workflow": AGENT_REPORT_WORKFLOW_NAME,
                    "target_origin": get_workflow_gateway_target_origin(),
                },
            )
            return
        if route == "/api/workflow/audit-records":
            query = parse_qs(urlparse(self.path).query)
            try:
                limit = max(1, min(50, int((query.get("limit") or ["10"])[0])))
            except ValueError:
                limit = 10
            self.send_json(
                200,
                {
                    "records": read_workflow_audit_summaries(limit)
                },
            )
            return

        super().do_GET()

    def handle_report_to_feishu_gateway(self) -> None:
        started_at = time.perf_counter()
        request_id = str(int(started_at * 1000))

        try:
            body = self.read_json_body()
            mode = get_workflow_gateway_mode()
            if mode == "disabled":
                self.send_json(503, {"error": "Workflow temporarily unavailable.", "code": "workflow_gateway_disabled"})
                print(f"workflow request {request_id}: disabled")
                return

            if mode == "mock_failure":
                self.send_json(502, {"error": "Workflow temporarily unavailable.", "code": "workflow_gateway_mock_failure"})
                print(f"workflow request {request_id}: mock_failure")
                return

            validation_error = self.validate_workflow_body(body)
            if validation_error:
                self.send_json(400, {"error": "Workflow temporarily unavailable.", "code": validation_error})
                print(f"workflow request {request_id}: rejected status=400 reason={validation_error}")
                return

            if mode == "mock_success":
                payload_hash = hashlib.sha256(json.dumps(body, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()
                self.send_json(
                    200,
                    {
                        "ok": True,
                        "workflow": AGENT_REPORT_WORKFLOW_NAME,
                        "mode": mode,
                        "run_id": f"mock_run_{request_id}",
                        "report_version": "synthetic_v1",
                        "snapshot_received": isinstance(body.get("session_snapshot"), dict),
                        "snapshot_schema_version": (
                            str(body["session_snapshot"].get("schemaVersion"))
                            if isinstance(body.get("session_snapshot"), dict)
                            and isinstance(body["session_snapshot"].get("schemaVersion"), str)
                            else None
                        ),
                        "received": {
                            "severity": body["SEVERITY_LEVEL"],
                            "student_id_suffix": str(body["Student_ID"])[-4:],
                            "markdown_length": len(str(body["input"])),
                            "time": body["time"],
                        },
                        "payload_hash": payload_hash,
                    },
                )
                print(f"workflow request {request_id}: mock_success")
                return

            if mode == "local_audit":
                record_path = write_workflow_audit_record(request_id, body, mode)
                stored_payload = json.loads(record_path.read_text(encoding="utf-8"))
                payload_hash = str(stored_payload.get("summary", {}).get("payloadHash") or "")
                self.send_json(
                    200,
                    {
                        "ok": True,
                        "workflow": AGENT_REPORT_WORKFLOW_NAME,
                        "mode": mode,
                        "run_id": f"audit_run_{request_id}",
                        "report_version": "audit_v1",
                        "audit_record_path": to_project_relative_path(record_path),
                        "payload_hash": payload_hash,
                        "snapshot_received": isinstance(body.get("session_snapshot"), dict),
                        "snapshot_schema_version": (
                            str(body["session_snapshot"].get("schemaVersion"))
                            if isinstance(body.get("session_snapshot"), dict)
                            and isinstance(body["session_snapshot"].get("schemaVersion"), str)
                            else None
                        ),
                    },
                )
                print(f"workflow request {request_id}: local_audit path={to_project_relative_path(record_path)}")
                return

            if mode == "agent_internal":
                record_path = write_workflow_audit_record(request_id, body, mode)
                stored_payload = json.loads(record_path.read_text(encoding="utf-8"))
                payload_hash = str(stored_payload.get("summary", {}).get("payloadHash") or "")
                session_id = str(stored_payload.get("summary", {}).get("sessionId") or "")
                self.send_json(
                    200,
                    {
                        "ok": True,
                        "workflow": AGENT_REPORT_WORKFLOW_NAME,
                        "mode": mode,
                        "run_id": f"agent_internal_{request_id}",
                        "report_version": "agent_internal_v1",
                        "audit_record_path": to_project_relative_path(record_path),
                        "payload_hash": payload_hash,
                        "session_id": session_id,
                        "snapshot_received": isinstance(body.get("session_snapshot"), dict),
                        "snapshot_schema_version": (
                            str(body["session_snapshot"].get("schemaVersion"))
                            if isinstance(body.get("session_snapshot"), dict)
                            and isinstance(body["session_snapshot"].get("schemaVersion"), str)
                            else None
                        ),
                        "message": "Agent-internal workflow path acknowledged. External Feishu confirmation still requires manual verification."
                    },
                )
                print(
                    f"workflow request {request_id}: agent_internal_ack "
                    f"path={to_project_relative_path(record_path)}"
                )
                return

            if mode == "forward":
                gateway_url = get_workflow_gateway_url()
                if not gateway_url:
                    self.send_json(
                        500,
                        {"error": "Workflow temporarily unavailable.", "code": "workflow_gateway_missing_url"},
                    )
                    print(f"workflow request {request_id}: forward_missing_url")
                    return

                timeout_seconds = get_workflow_gateway_timeout_seconds()
                forward_status, forward_body = post_json(
                    gateway_url,
                    build_workflow_gateway_headers(),
                    body,
                    timeout_seconds,
                )

                parsed_body = try_parse_json_bytes(forward_body)
                if 200 <= forward_status < 300:
                    response_payload = {
                        "ok": True,
                        "workflow": AGENT_REPORT_WORKFLOW_NAME,
                        "mode": mode,
                        "run_id": f"forward_run_{request_id}",
                        "report_version": "forward_v1",
                        "forward_status": forward_status,
                        "target_origin": get_workflow_gateway_target_origin(),
                    }
                    if isinstance(parsed_body, dict):
                        response_payload.update(parsed_body)
                    self.send_json(200, response_payload)
                    print(
                        f"workflow request {request_id}: forward_success "
                        f"status={forward_status} target={get_workflow_gateway_target_origin()}"
                    )
                    return

                error_message = "Workflow temporarily unavailable."
                response_payload = {
                    "error": error_message,
                    "code": "workflow_gateway_forward_failed",
                    "forward_status": forward_status,
                    "target_origin": get_workflow_gateway_target_origin(),
                }
                if isinstance(parsed_body, dict):
                    if isinstance(parsed_body.get("error"), str):
                        response_payload["error"] = parsed_body["error"]
                    if isinstance(parsed_body.get("message"), str):
                        response_payload["message"] = parsed_body["message"]
                    response_payload["upstream"] = parsed_body
                self.send_json(502, response_payload)
                print(
                    f"workflow request {request_id}: forward_failed "
                    f"status={forward_status} target={get_workflow_gateway_target_origin()}"
                )
                return

            self.send_json(500, {"error": "Workflow temporarily unavailable.", "code": "workflow_gateway_invalid_mode"})
            print(f"workflow request {request_id}: invalid_mode mode={mode}")
        except json.JSONDecodeError:
            self.send_json(400, {"error": "Workflow temporarily unavailable.", "code": "invalid_json"})
            print(f"workflow request {request_id}: rejected status=400 reason=invalid_json")
        except Exception as exc:
            self.send_json(
                500,
                {
                    "error": "Workflow temporarily unavailable.",
                    "code": "handler_error",
                    "detail": f"{type(exc).__name__}: {exc}",
                },
            )
            print(f"workflow request {request_id}: failed reason={type(exc).__name__} message={exc}")
        finally:
            elapsed_ms = int((time.perf_counter() - started_at) * 1000)
            print(f"workflow request {request_id}: completed elapsed_ms={elapsed_ms}")

    def read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        body_bytes = self.rfile.read(content_length)
        for encoding in ("utf-8", "utf-8-sig", "utf-16", "utf-16le", "utf-16be"):
            try:
                return json.loads(body_bytes.decode(encoding))
            except UnicodeDecodeError:
                continue
            except json.JSONDecodeError:
                continue
        return json.loads(body_bytes.decode("utf-8", errors="replace"))

    def extract_query(self, body: dict) -> str:
        messages = body.get("additional_messages", [])
        if not messages:
            user_text = "hello"
        else:
            last_message = messages[-1] or {}
            user_text = str(last_message.get("content") or "hello")

        repair_instruction = str(body.get("response_repair_instruction") or "").strip()[:2000]
        context_packet = body.get("local_context_packet")
        if isinstance(context_packet, dict):
            return self.compose_query_with_context(context_packet, user_text, repair_instruction)

        if repair_instruction:
            return "\n".join(
                [
                    "[CURRENT USER MESSAGE]",
                    user_text,
                    "",
                    "[LOCAL RESPONSE REPAIR INSTRUCTION]",
                    repair_instruction,
                    "Respond to the current user message above. Do not mention this repair instruction.",
                ]
            )

        return user_text

    def compose_query_with_context(self, packet: dict, user_text: str, repair_instruction: str = "") -> str:
        safety = packet.get("safety") if isinstance(packet.get("safety"), dict) else {}
        recent_agent = packet.get("recentAgentEvidence") if isinstance(packet.get("recentAgentEvidence"), list) else []
        recent_dialogue = packet.get("recentDialogueTurns") if isinstance(packet.get("recentDialogueTurns"), list) else []
        interaction = packet.get("interaction") if isinstance(packet.get("interaction"), dict) else {}
        response_plan = packet.get("responsePlan") if isinstance(packet.get("responsePlan"), dict) else {}
        agent_payload = packet.get("agentInternalPayload") if isinstance(packet.get("agentInternalPayload"), dict) else None

        def format_simple_list(items: list[object]) -> list[str]:
            return [f"- {str(item)}" for item in items[:12] if str(item).strip()]

        def format_dialogue(items: list[object]) -> list[str]:
            lines: list[str] = []
            for item in items[-8:]:
                if not isinstance(item, dict):
                    continue
                role = str(item.get("role") or "")
                text = str(item.get("text") or "").strip()
                if role in {"user", "agent"} and text:
                    lines.append(f"- {role}: {text}")
            return lines

        # Keep the Agent prompt limited to dialogue, safety state, and the local
        # response plan; assessment fields remain local report metadata.
        context_lines = [
            "[LOCAL CONVERSATION CONTEXT]",
            f"sessionId: {str(packet.get('sessionId') or '')}",
            "[CURRENT USER MESSAGE]",
            user_text,
            "[SAFETY STATE]",
            f"workflowLabel: {str(safety.get('workflowLabel') or '')}",
            f"summary: {str(safety.get('summary') or '')}",
            f"safetyConfirmation: {str(safety.get('safetyConfirmation') or '')}",
            f"resourceNoticeNeeded: {str(safety.get('resourceNoticeNeeded') or False)}",
        ]
        if recent_agent:
            context_lines.append("[Recent assistant replies]")
            context_lines.extend(format_simple_list(recent_agent))
        if recent_dialogue:
            context_lines.append("[Ordered dialogue]")
            context_lines.extend(format_dialogue(recent_dialogue))
        context_lines.extend(
            [
                "",
                "[MANDATORY LOCAL RESPONSE PLAN]",
                f"mode: {str(interaction.get('mode') or 'support')}",
                f"questionPermission: {str(response_plan.get('questionPermission') or interaction.get('questionPermission') or 'natural_follow_up')}",
                f"responseGoal: {str(response_plan.get('responseGoal') or 'support')}",
                f"allowClosure: {str(response_plan.get('allowClosure') or False)}",
                f"lastIntent: {str(interaction.get('lastIntent') or '')}",
                f"factsToReflect: {json.dumps(response_plan.get('factsToReflect') or [], ensure_ascii=False)}",
                "This mandatory response plan overrides every earlier dialogue instruction in this prompt.",
                "Do not use any report field, dialogue stage, or collection order to decide the student-facing response.",
                "Never ask a question just to fill a report field. First respond to the student's current topic using the ordered dialogue above.",
                "If questionPermission is forbidden, do not ask any question. If it is natural_follow_up, ask at most one open question that directly follows the current topic; no questionnaires or diagnostic wording.",
                "Treat third-party, fictional, quoted, and hypothetical content as non-self content. Do not attribute it to the student or place it in a student report.",
                "Do not state that a report was created, that data is private, or that a workflow succeeded unless that fact is explicitly confirmed in this context.",
            ]
        )
        last_intent = str(interaction.get("lastIntent") or "")
        if (
            response_plan.get("responseGoal") == "safety"
            and response_plan.get("allowedQuestionGoal") == "immediate_safety"
        ):
            context_lines.extend(
                [
                    "Safety is the highest priority in this turn. Acknowledge the student's disclosure without diagnosing.",
                    "Before or alongside practical support, ask exactly one direct current-safety confirmation: whether the student is currently safe, has already harmed themselves, or may act soon.",
                    "Use a clear, answerable Chinese question such as whether they are currently safe or may immediately hurt themselves.",
                    "Do not replace the safety confirmation with a question about contacting someone. Do not ask duration, sleep, functional impact, or any other report field in this turn.",
                    "If immediate danger may be present, prioritize contacting a nearby trusted person, local emergency services, or an emergency department.",
                ]
            )
        elif last_intent == "support_decision_question":
            context_lines.extend(
                [
                    "Answer the student's professional-help decision question before anything else. Be non-diagnostic and practical: distinguish counselling support from medical assessment, explain observable reasons to seek each, and name immediate safety or medical warning signs that need urgent real-world help.",
                    "Do not invent a school contact, imply a diagnosis, or follow the answer with an assessment-field question.",
                ]
            )
        elif last_intent == "third_party_support":
            context_lines.extend(
                [
                    "Answer the peer-support request directly. Offer concrete, privacy-respecting ways to check in, invite real-world support, and respond to observable urgent danger. Do not diagnose or collect the third party's private history.",
                    "Do not attribute the third party's experience to the student or place it in the student's assessment report.",
                ]
            )
        elif last_intent == "creative_request":
            context_lines.extend(
                [
                    "Answer the stated creative-writing request directly. Treat fictional material as fictional; do not ask whether it is secretly about the student and do not start a safety assessment from the fictional quote alone.",
                ]
            )
        elif last_intent == "risk_clarification":
            context_lines.extend(
                [
                    "Acknowledge the student's explicit clarification about the meaning of their words. Do not label it as self-harm risk, make a causal claim about their mental state, recommend escalation solely from that phrase, or pivot to report fields.",
                ]
            )
        elif interaction.get("mode") == "medical":
            context_lines.extend(
                [
                    "Prioritize real-world medical safety. Do not diagnose or attribute physical symptoms to psychology. Briefly ask only what is needed to determine whether symptoms are current or worsening, and advise timely medical or emergency help when symptoms are severe, ongoing, or accompanied by danger signs.",
                ]
            )
        elif response_plan.get("responseGoal") == "answer_directly":
            context_lines.extend(
                [
                    "Answer the student's privacy or record question directly and stop there.",
                    "The access-control and retention policy is not confirmed in this context. State that limitation plainly instead of promising confidentiality or naming who can view records.",
                ]
            )
        elif interaction.get("mode") == "free_chat":
            context_lines.extend(
                [
                    "In free_chat mode, ground the reply in at least one concrete detail from factsToReflect or the ordered dialogue. Do not add a dramatic interpretation, causal claim, diagnosis, or generic 'I am here listening' filler.",
                    "Do not offer to end the conversation unless allowClosure is true.",
                ]
            )
        if repair_instruction:
            context_lines.extend(
                [
                    "",
                    "[LOCAL RESPONSE REPAIR INSTRUCTION]",
                    "The previous draft failed a local response check. Rewrite the reply for the current user message above.",
                    repair_instruction,
                    "Do not mention this repair instruction or local processing in the student-facing reply.",
                ]
            )
        if agent_payload and all(isinstance(agent_payload.get(key), str) and agent_payload.get(key).strip() for key in ("input", "SEVERITY_LEVEL", "Student_ID", "time")):
            context_lines.extend(
                [
                    "",
                    "[Agent 内部工具 payload]",
                    f"本地系统已生成并审计以下 payload。必须且只能调用 {AGENT_REPORT_WORKFLOW_NAME}，原样传递这四个字段；不得重写、补写或展示报告正文。",
                    json.dumps(
                        {
                            "input": agent_payload["input"],
                            "SEVERITY_LEVEL": agent_payload["SEVERITY_LEVEL"],
                            "Student_ID": agent_payload["Student_ID"],
                            "time": agent_payload["time"],
                        },
                        ensure_ascii=False,
                    ),
                ]
            )
        return "\n".join(context_lines)

    def validate_workflow_body(self, body: dict) -> str | None:
        required_fields = ["input", "SEVERITY_LEVEL", "Student_ID", "time"]
        for field_name in required_fields:
            value = body.get(field_name)
            if not isinstance(value, str) or not value.strip():
                return f"missing_{field_name.lower()}"
        report_markdown = str(body.get("input") or "").strip()
        if len(report_markdown) < 10:
            return "report_too_short"
        session_snapshot = body.get("session_snapshot")
        if session_snapshot is not None and not isinstance(session_snapshot, dict):
            return "invalid_session_snapshot"
        return None

    def get_or_create_conversation(self, api_key: str, user_id: str, bot_id: str, session_id: str, request_id: str) -> str | None:
        conv_key = (session_id or "no_session", user_id, bot_id)
        if conv_key in conversations:
            return conversations[conv_key]

        persisted_conversation = load_persisted_conversation(get_conversation_map_key(*conv_key))
        if persisted_conversation:
            conversations[conv_key] = persisted_conversation
            print(f"chat request {request_id}: restored_upstream_conversation")
            return persisted_conversation

        create_url = f"{BASE_URL}/create_conversation"
        status, body = post_json(
            create_url,
            {"Apikey": api_key, "Content-Type": "application/json"},
            {"AppKey": bot_id, "UserID": user_id},
            CREATE_TIMEOUT_SECONDS,
        )

        if status != 200:
            mapped_status = normalize_upstream_status(status)
            self.send_json_error(mapped_status, f"create_conversation_{status}")
            print(f"chat request {request_id}: create_conversation_failed upstream_status={status}")
            return None

        try:
            data = json.loads(body.decode("utf-8"))
            conversation_id = data["Conversation"]["AppConversationID"]
        except Exception:
            self.send_json_error(502, "invalid_create_conversation_response")
            print(f"chat request {request_id}: create_conversation_invalid_schema")
            return None

        conversations[conv_key] = conversation_id
        persist_conversation(get_conversation_map_key(*conv_key), conversation_id)
        print(f"chat request {request_id}: created_upstream_conversation")
        return conversation_id

    def stream_chat(
        self,
        api_key: str,
        bot_id: str,
        user_id: str,
        user_name: str,
        query: str,
        conversation_id: str,
        request_id: str,
    ) -> None:
        chat_url = f"{BASE_URL}/chat_query"
        chat_body = json.dumps(
            {
                "AppKey": bot_id,
                "AppConversationID": conversation_id,
                "Query": query,
                "UserID": user_id,
                "UserName": user_name,
                "ResponseMode": "streaming",
            }
        ).encode("utf-8")
        req = request.Request(
            chat_url,
            data=chat_body,
            headers={"Apikey": api_key, "Content-Type": "application/json"},
            method="POST",
        )

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        try:
            with request.urlopen(req, timeout=STREAM_TIMEOUT_SECONDS) as resp:
                if resp.status != 200:
                    print(f"chat request {request_id}: chat_query_failed upstream_status={resp.status}")
                    self.write_sse({"content": "Service temporarily unavailable.", "error": {"status": resp.status}})
                    self.wfile.write(b"data: [DONE]\n\n")
                    return

                for raw_line in resp:
                    decoded_line = raw_line.decode("utf-8", errors="replace").strip()
                    if not decoded_line.startswith("data:"):
                        continue
                    content_part = decoded_line[5:].strip()
                    if content_part.startswith("data:"):
                        content_part = content_part[5:].strip()
                    if not content_part:
                        continue
                    self.forward_stream_event(content_part, request_id)

            self.wfile.write(b"data: [DONE]\n\n")
        except error.HTTPError as exc:
            print(f"chat request {request_id}: chat_query_failed upstream_status={exc.code}")
            self.write_sse(build_chat_upstream_error_payload(exc.code, exc.read()))
            self.wfile.write(b"data: [DONE]\n\n")
        except TimeoutError:
            print(f"chat request {request_id}: chat_query_timeout")
            self.write_sse(
                {
                    "content": "Service timed out. Please try again later.",
                    "message": "Service timed out. Please try again later.",
                    "error": {"code": "timeout"},
                }
            )
            self.wfile.write(b"data: [DONE]\n\n")
        except OSError as exc:
            if "WinError 10053" in str(exc) or "Broken pipe" in str(exc):
                print(f"chat request {request_id}: client_disconnected")
                return
            print(f"chat request {request_id}: stream_error reason={type(exc).__name__}")
            self.write_sse(
                {
                    "content": "Service temporarily unavailable.",
                    "message": "Service temporarily unavailable.",
                    "error": {"code": "stream_error"},
                }
            )
            self.wfile.write(b"data: [DONE]\n\n")

    def forward_stream_event(self, content_part: str, request_id: str) -> None:
        try:
            event_data = json.loads(content_part)
        except json.JSONDecodeError:
            print(f"chat request {request_id}: upstream_json_decode_error")
            return

        event_type = event_data.get("event")
        if event_type == "message":
            answer = event_data.get("answer", "")
            if answer:
                self.write_sse({"content": answer})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


def main() -> None:
    print(f"Starting proxy server on http://127.0.0.1:{PORT}/")
    print(f"Serving static files from {PROJECT_ROOT}")
    with ThreadingHTTPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == "__main__":
    main()
