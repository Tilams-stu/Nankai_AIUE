# Goal 8 Live Integration Helper Check - 2026-07-25

## Scope

This check covers the new executable helper layer for future real integration:

- `test_api.py`
- `scripts/check_live_nankai_chat.ps1`
- `scripts/check_live_workflow_forward.ps1`
- `tests/live_nankai_chat_check.md`
- `tests/workflow_forward_check.md`
- `scripts/run_local.md`
- `README.md`

## Implementation Result

- `test_api.py` now supports configurable base URL, test query, user id, and timeouts through environment variables.
- `scripts/check_live_nankai_chat.ps1` wraps the live NK-GeniOS conversation check and expects `LIVE_NANKAI_CHAT_PASS`.
- `scripts/check_live_workflow_forward.ps1` wraps the live workflow-forward check and expects `LIVE_WORKFLOW_FORWARD_PASS`.
- The docs now expose a single command path for each real integration check instead of requiring manual command assembly.

## Local Verification

These helpers require external credentials for full execution, so this local slice verifies:

- script files exist and are referenced in docs
- `test_api.py` still reads required environment variables and remains import/execute-safe
- existing offline smoke path remains unaffected

Commands run:

```powershell
python -m compileall server
npm run smoke
```

Result: passed.

## Remaining External Requirement

- Real execution of these helper scripts still depends on valid `NANKAI_API_KEY`, `NANKAI_BOT_ID`, and, only when the optional `forward` path is used, workflow-gateway credentials.
