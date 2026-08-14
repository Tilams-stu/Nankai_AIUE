# Live NK-GeniOS Chat Check

This check is for real NK-GeniOS connectivity. It requires a valid upstream key and bot id.

## Required Environment

```powershell
$env:NANKAI_API_KEY="replace_with_real_key"
$env:NANKAI_BOT_ID="replace_with_real_bot_id"
$env:NANKAI_TEST_USER_ID="synthetic_test_user_001"
$env:NANKAI_TEST_QUERY="你好，请做一次简短的测试回复。"
```

Optional environment:

```powershell
$env:NANKAI_BASE_URL="https://coze.nankai.edu.cn/api/proxy/api/v1"
$env:NANKAI_CREATE_TIMEOUT_SECONDS="10"
$env:NANKAI_CHAT_TIMEOUT_SECONDS="30"
```

## Command

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check_live_integration_prerequisites.ps1
powershell -ExecutionPolicy Bypass -File scripts/check_live_nankai_chat.ps1
```

Expected preflight result: `LIVE_INTEGRATION_PREFLIGHT_READY`

Expected result: `LIVE_NANKAI_CHAT_PASS`

Combined live check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check_all_live_integrations.ps1
```

Expected automated bundle result: `ALL_LIVE_AUTOMATED_CHECKS_PASS`

Manual steps still required after that:

- confirm Agent-internal `report-to-feishu` execution
- confirm Feishu row visibility

## Acceptance Notes

- This verifies only live NK-GeniOS conversation creation and streaming response.
- It does not verify workflow forwarding or Feishu table visibility.
