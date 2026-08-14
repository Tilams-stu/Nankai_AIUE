from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler
from socketserver import TCPServer


PORT = int(os.getenv("MENTAL_LLM_MOCK_CHAT_PORT", "8898"))
BLOCKED_MODEL_ID = os.getenv("MENTAL_LLM_MOCK_BLOCKED_MODEL_ID", "mock-blocked-model")


class MockChatUpstreamHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def send_json(self, status_code: int, payload: dict) -> None:
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        body_bytes = self.rfile.read(content_length)

        if self.path == "/api/proxy/api/v1/create_conversation":
            self.send_json(
                200,
                {
                    "Conversation": {
                        "AppConversationID": "mock-conversation-001",
                        "ConversationName": "mock",
                    },
                    "BaseResp": None,
                },
            )
            return

        if self.path == "/api/proxy/api/v1/chat_query":
            self.send_json(
                500,
                {
                    "ResponseMetadata": {
                        "Error": {
                            "Code": "InternalError.Error",
                            "Message": f'Internal error: TransChatMessageRequest error: model no permission, modelIDs:["{BLOCKED_MODEL_ID}"]',
                        }
                    }
                },
            )
            return

        self.send_json(404, {"error": "not_found"})


def main() -> None:
    with TCPServer(("127.0.0.1", PORT), MockChatUpstreamHandler) as httpd:
        httpd.serve_forever()


if __name__ == "__main__":
    main()
