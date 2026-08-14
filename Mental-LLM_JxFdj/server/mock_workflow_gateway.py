from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler
from socketserver import TCPServer


PORT = int(os.getenv("MENTAL_LLM_MOCK_WORKFLOW_PORT", "8899"))
EXPECTED_TOKEN = os.getenv("MENTAL_LLM_MOCK_WORKFLOW_TOKEN", "mock-token").strip()


class MockWorkflowGatewayHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def send_json(self, status_code: int, payload: dict) -> None:
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def do_POST(self):
        if self.path != "/workflow/report-to-feishu":
            self.send_json(404, {"error": "not_found"})
            return

        auth_header = self.headers.get("Authorization", "")
        if auth_header != f"Bearer {EXPECTED_TOKEN}":
            self.send_json(
                401,
                {
                    "error": "unauthorized",
                    "message": "Missing or invalid workflow gateway token."
                },
            )
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        body_bytes = self.rfile.read(content_length)
        try:
            body = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            self.send_json(400, {"error": "invalid_json"})
            return

        required_fields = ["input", "SEVERITY_LEVEL", "Student_ID", "time"]
        missing_fields = [field for field in required_fields if not isinstance(body.get(field), str) or not body.get(field).strip()]
        if missing_fields:
            self.send_json(
                400,
                {
                    "error": "missing_fields",
                    "message": ",".join(missing_fields),
                },
            )
            return

        self.send_json(
            200,
            {
                "ok": True,
                "run_id": "mock_forward_run_001",
                "report_version": "forward_mock_v1",
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
            },
        )


def main() -> None:
    with TCPServer(("127.0.0.1", PORT), MockWorkflowGatewayHandler) as httpd:
      httpd.serve_forever()


if __name__ == "__main__":
    main()
