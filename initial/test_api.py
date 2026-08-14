import requests
import json

BASE_URL = "https://coze.nankai.edu.cn/api/proxy/api/v1"
API_KEY = "d5nfpqelvndavkun6da0"
BOT_ID = "d4hd19coj60m6gidvts0"
USER_ID = "test_user_003"

headers = {"Apikey": API_KEY, "Content-Type": "application/json"}

# 1. Create Conversation
resp = requests.post(f"{BASE_URL}/create_conversation", headers=headers, json={"AppKey": BOT_ID, "UserID": USER_ID})
app_conv_id = resp.json()["Conversation"]["AppConversationID"]

# 2. Chat Query (Streaming)
url = f"{BASE_URL}/chat_query"
body = {
    "AppKey": BOT_ID, "AppConversationID": app_conv_id,
    "Query": "你好", "UserID": USER_ID, "ResponseMode": "streaming"
}

with requests.post(url, headers=headers, json=body, stream=True) as r:
    for line in r.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            print(f"RAW: {line_str}")
