import json
import os
from urllib import error, request


API_KEY_ENV = "NANKAI_API_KEY"
BOT_ID_ENV = "NANKAI_BOT_ID"
BASE_URL_ENV = "NANKAI_BASE_URL"
TEST_QUERY_ENV = "NANKAI_TEST_QUERY"
TEST_USER_ID_ENV = "NANKAI_TEST_USER_ID"
CREATE_TIMEOUT_ENV = "NANKAI_CREATE_TIMEOUT_SECONDS"
CHAT_TIMEOUT_ENV = "NANKAI_CHAT_TIMEOUT_SECONDS"


def get_base_url():
    return os.getenv(BASE_URL_ENV, "https://coze.nankai.edu.cn/api/proxy/api/v1").strip()


def require_env(name):
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def get_timeout(name, default_value):
    raw_value = os.getenv(name, str(default_value)).strip()
    try:
        return max(1, int(raw_value))
    except ValueError:
        return default_value


def post_json(url, headers, payload, timeout):
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=body, headers=headers, method="POST")
    with request.urlopen(req, timeout=timeout) as response:
        return response.status, response.read()


def format_http_error(exc):
    try:
        body = exc.read().decode("utf-8", errors="replace")
    except Exception:
        body = ""
    return f"HTTP {exc.code}: {body}" if body else f"HTTP {exc.code}"


def main():
    base_url = get_base_url()
    api_key = require_env(API_KEY_ENV)
    bot_id = require_env(BOT_ID_ENV)
    user_id = os.getenv(TEST_USER_ID_ENV, "synthetic_test_user_001")[:20]
    test_query = os.getenv(TEST_QUERY_ENV, "hello").strip() or "hello"
    create_timeout = get_timeout(CREATE_TIMEOUT_ENV, 10)
    chat_timeout = get_timeout(CHAT_TIMEOUT_ENV, 30)
    headers = {"Apikey": api_key, "Content-Type": "application/json"}

    try:
        status, create_body = post_json(
            f"{base_url}/create_conversation",
            headers,
            {"AppKey": bot_id, "UserID": user_id},
            timeout=create_timeout,
        )
    except error.HTTPError as exc:
        raise SystemExit(f"create_conversation failed: {format_http_error(exc)}")
    if status != 200:
        raise SystemExit(f"create_conversation failed with status {status}")

    app_conv_id = json.loads(create_body.decode("utf-8"))["Conversation"]["AppConversationID"]
    chat_body = {
        "AppKey": bot_id,
        "AppConversationID": app_conv_id,
        "Query": test_query,
        "UserID": user_id,
        "ResponseMode": "streaming",
    }

    req = request.Request(
        f"{base_url}/chat_query",
        data=json.dumps(chat_body).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=chat_timeout) as response:
            if response.status != 200:
                raise SystemExit(f"chat_query failed with status {response.status}")
            for line in response:
                decoded = line.decode("utf-8", errors="replace").strip()
                if decoded:
                    print(decoded)
    except error.HTTPError as exc:
        raise SystemExit(f"chat_query failed: {format_http_error(exc)}")


if __name__ == "__main__":
    main()
