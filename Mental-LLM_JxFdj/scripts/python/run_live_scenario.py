import json
import os
import sys
from urllib import error, request


API_KEY_ENV = "NANKAI_API_KEY"
BOT_ID_ENV = "NANKAI_BOT_ID"
BASE_URL_ENV = "NANKAI_BASE_URL"
TEST_USER_ID_ENV = "NANKAI_TEST_USER_ID"


SCENARIO = [
    "我最近论文压力很大，晚上总是睡不好。",
    "大概持续了一个月，最近上课注意力也差了很多。",
    "没有想伤害自己，就是很累，也不太想和别人说话。",
    "先到这里，帮我做一个简短总结，并告诉我接下来会怎么处理记录。",
]


def require_env(name):
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def get_base_url():
    return os.getenv(BASE_URL_ENV, "https://coze.nankai.edu.cn/api/proxy/api/v1").strip()


def post_json(url, headers, payload, timeout):
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=body, headers=headers, method="POST")
    with request.urlopen(req, timeout=timeout) as response:
        return response.status, response.read()


def create_conversation(base_url, headers, bot_id, user_id):
    status, create_body = post_json(
        f"{base_url}/create_conversation",
        headers,
        {"AppKey": bot_id, "UserID": user_id},
        timeout=10,
    )
    if status != 200:
        raise SystemExit(f"create_conversation failed with status {status}")
    return json.loads(create_body.decode("utf-8"))["Conversation"]["AppConversationID"]


def stream_answer(base_url, headers, bot_id, user_id, conversation_id, query):
    chat_body = {
        "AppKey": bot_id,
        "AppConversationID": conversation_id,
        "Query": query,
        "UserID": user_id,
        "UserName": "Synthetic User",
        "ResponseMode": "streaming",
    }

    req = request.Request(
        f"{base_url}/chat_query",
        data=json.dumps(chat_body).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    answer_parts = []
    with request.urlopen(req, timeout=60) as response:
        if response.status != 200:
            raise SystemExit(f"chat_query failed with status {response.status}")
        for raw in response:
            line = raw.decode("utf-8", errors="replace").strip()
            if not line.startswith("data:"):
                continue
            content = line[5:].strip()
            if content.startswith("data:"):
                content = content[5:].strip()
            if not content:
                continue
            try:
                payload = json.loads(content)
            except Exception:
                continue
            if payload.get("event") == "message" and payload.get("answer"):
                answer_parts.append(payload["answer"])
    return "".join(answer_parts)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    base_url = get_base_url()
    api_key = require_env(API_KEY_ENV)
    bot_id = require_env(BOT_ID_ENV)
    user_id = os.getenv(TEST_USER_ID_ENV, "synthetic_test_user_001")[:20]
    headers = {"Apikey": api_key, "Content-Type": "application/json"}

    conversation_id = create_conversation(base_url, headers, bot_id, user_id)
    print(f"CONV={conversation_id}")

    for index, query in enumerate(SCENARIO, 1):
        print(f"QUERY_{index}={query}")
        try:
            answer = stream_answer(base_url, headers, bot_id, user_id, conversation_id, query)
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise SystemExit(f"chat_query failed: HTTP {exc.code}: {body}")
        print(f"ANSWER_{index}_START")
        print(answer)
        print(f"ANSWER_{index}_END")


if __name__ == "__main__":
    main()
