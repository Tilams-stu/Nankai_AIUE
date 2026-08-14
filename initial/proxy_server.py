import http.server
import socketserver
import json
import requests
import sys
import mimetypes

# Ensure .glb MIME type is registered
mimetypes.add_type('model/gltf-binary', '.glb')

PORT = 8000
BASE_URL = "https://coze.nankai.edu.cn/api/proxy/api/v1"

# Store conversation IDs: (user_id, bot_id) -> app_conversation_id
conversations = {}

class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/chat':
            try:
                content_length = int(self.headers['Content-Length'])
                body_bytes = self.rfile.read(content_length)
                body = json.loads(body_bytes.decode('utf-8'))
                
                user_id = body.get('user_id', 'guest')
                user_name = body.get('user_name', 'Student')
                # Ensure user_id is within 20 chars (Nankai API limit)
                safe_user_id = user_id[:20] if user_id else 'guest'
                
                bot_id = body.get('bot_id')
                
                # Use a combined key to support multiple bots per user
                conv_key = (safe_user_id, bot_id)
                
                # Extract the last user message
                messages = body.get('additional_messages', [])
                query = "你好"
                if messages and len(messages) > 0:
                    query = messages[-1].get('content', '你好')
                
                # API Key from Authorization header (Bearer ...)
                auth_header = self.headers.get('Authorization', '')
                api_key = auth_header.replace('Bearer ', '').strip() if 'Bearer' in auth_header else auth_header
                
                # 1. Get or Create Conversation
                if conv_key not in conversations:
                    print(f"Creating conversation for user: {safe_user_id} with bot: {bot_id}")
                    create_url = f"{BASE_URL}/create_conversation"
                    create_headers = {
                        "Apikey": api_key,
                        "Content-Type": "application/json"
                    }
                    # Use Bot ID as AppKey based on testing
                    create_body = {
                        "AppKey": bot_id,
                        "UserID": safe_user_id
                    }
                    
                    try:
                        resp = requests.post(create_url, headers=create_headers, json=create_body, timeout=10)
                        if resp.status_code == 200:
                            data = resp.json()
                            if "Conversation" in data and "AppConversationID" in data["Conversation"]:
                                conversations[conv_key] = data["Conversation"]["AppConversationID"]
                                print(f"Created Conversation ID: {conversations[conv_key]}")
                            else:
                                raise Exception(f"Invalid create response: {resp.text}")
                        else:
                            raise Exception(f"Create failed: {resp.status_code} {resp.text}")
                    except Exception as e:
                        print(f"Error creating conversation: {e}")
                        self.send_error(500, f"Failed to create conversation: {str(e)}")
                        return

                app_conv_id = conversations[conv_key]
                
                # 2. Send Chat Query
                chat_url = f"{BASE_URL}/chat_query"
                chat_headers = {
                    "Apikey": api_key,
                    "Content-Type": "application/json"
                }
                chat_body = {
                    "AppKey": bot_id,
                    "AppConversationID": app_conv_id,
                    "Query": query,
                    "UserID": safe_user_id,
                    "UserName": user_name,
                    "ResponseMode": "streaming"
                }
                
                print(f"Sending chat query to {chat_url}")
                
                # Start streaming response
                self.send_response(200)
                self.send_header('Content-Type', 'text/event-stream')
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('Connection', 'close') # Force close to avoid browser connection limit
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                with requests.post(chat_url, headers=chat_headers, json=chat_body, stream=True) as r:
                    if r.status_code != 200:
                        print(f"Chat API Error: {r.status_code} {r.text}")
                        self.wfile.write(f"data: {json.dumps({'content': f'Error: {r.status_code}'})}\n\n".encode())
                        return

                    for line in r.iter_lines():
                        if line:
                            decoded_line = line.decode('utf-8')
                            # Handle "data:data: {...}" or "data: {...}"
                            if decoded_line.startswith('data:'):
                                # Strip the first "data:"
                                content_part = decoded_line[5:].strip()
                                # Check if there is a second "data:" (based on my test output)
                                if content_part.startswith('data:'):
                                    content_part = content_part[5:].strip()
                                
                                try:
                                    # Skip if empty
                                    if not content_part: continue
                                    
                                    event_data = json.loads(content_part)
                                    event_type = event_data.get('event')
                                    
                                    if event_type == 'message':
                                        answer = event_data.get('answer', '')
                                        if answer:
                                            # Convert to Coze format expected by frontend
                                            out_data = {"content": answer}
                                            self.wfile.write(f"data: {json.dumps(out_data)}\n\n".encode())
                                            self.wfile.flush()
                                    elif event_type in ['message_end', 'done']:
                                        # End of stream
                                        pass
                                except json.JSONDecodeError:
                                    print(f"JSON Decode Error: {content_part}")
                                except Exception as e:
                                    # Ignore connection aborted error (client disconnected)
                                    if "WinError 10053" in str(e) or "Broken pipe" in str(e):
                                        print(f"Client disconnected during stream.")
                                        return
                                    print(f"Stream processing error: {e}")
                
                # Send Done
                try:
                    self.wfile.write(b"data: [DONE]\n\n")
                except Exception:
                    pass
                
            except Exception as e:
                print(f"Handler Error: {e}")
                # If headers not sent, send 500
                # If headers sent, we can't do much but close
        else:
            try:
                super().do_POST()
            except Exception:
                pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    # Override log_message to reduce noise
    def log_message(self, format, *args):
        pass

print(f"Starting proxy server on port {PORT}...")
# socketserver.TCPServer.allow_reuse_address = True
with ThreadingHTTPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
