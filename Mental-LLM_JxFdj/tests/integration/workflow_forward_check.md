# Workflow Forward Check

This check is for real integration preparation. It is not part of the default local smoke run because it requires external gateway access.

There is also a local offline adapter check available:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check_forward_workflow_gateway.ps1
```

Expected result: `FORWARD_WORKFLOW_GATEWAY_PASS`

For a real gateway after credentials are available:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check_live_integration_prerequisites.ps1
powershell -ExecutionPolicy Bypass -File scripts/check_live_workflow_forward.ps1
```

Expected preflight result: `LIVE_INTEGRATION_PREFLIGHT_READY`

Expected result: `LIVE_WORKFLOW_FORWARD_PASS`

Prerequisite environment:

- `MENTAL_LLM_WORKFLOW_GATEWAY_URL`
- `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_TOKEN`
- optional auth header/scheme overrides

## Required Environment

```powershell
$env:MENTAL_LLM_WORKFLOW_GATEWAY_MODE="forward"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_URL="https://your-internal-gateway.example/workflow/report-to-feishu"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_TIMEOUT_SECONDS="20"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_HEADER="Authorization"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_SCHEME="Bearer"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_TOKEN="replace_with_gateway_token"
```

## Expected Checks

1. `GET /api/workflow/status`
   - Expect `mode=forward`
   - Expect `enabled=true`
   - Expect `target_origin` to match the configured gateway origin

2. `POST /api/workflow/report-to-feishu`
   - Send a synthetic payload using fields:
     - `input`
     - `SEVERITY_LEVEL`
     - `Student_ID`
     - `time`
   - Optional: include `session_snapshot`
   - Expect local proxy HTTP 200 when the upstream gateway accepts the request

3. Failure branch
   - With an invalid gateway token or invalid URL, expect proxy HTTP 502
   - Expect JSON body to include:
     - `code=workflow_gateway_forward_failed`
     - `forward_status`
     - `target_origin`

## Acceptance Notes

- This verifies only the local proxy forward adapter and the internal gateway contract.
- Final Feishu table visibility remains a separate external confirmation step.

## July 28, 2026 Alignment Additions

1. The `input` field should contain the Chinese non-diagnostic backend report template instead of the old English prototype record.
2. If a session snapshot is included, it should expose `dialogueStage`, `assessment`, and safety evidence so backend audit can trace why upload happened.
3. `RX` or other incomplete-safety states must still be uploadable for backend follow-up; they must not be filtered out as if they were low-risk.
