# Goal 8 Model Permission Error Path Check - 2026-07-25

## Scope

This check verifies the new offline regression path for the real upstream blocker:

- `server/mock_chat_upstream.py`
- `scripts/check_upstream_model_permission_error.ps1`
- `server/proxy_server.py`
- `src/services/chatService.ts`
- `src/app/chatRuntime.js`

## Verification Command

Run from `D:\Desktop\Software\AIUE\Mental-LLM_JxFdj`.

```powershell
npm run validate:error:model-permission
```

## Result

Passed with:

```text
UPSTREAM_MODEL_PERMISSION_ERROR_PASS
```

## What Was Proven

- The mock upstream can return a real-looking `model no permission` platform error.
- The local proxy detects that upstream failure and maps it to:
  - `error.code=upstream_model_no_permission`
  - a user-facing message
  - blocked model ids
- The SSE response still completes in a controlled way.

## Acceptance Outcome

- The current real blocker is no longer only a one-off live observation.
- It now has a stable offline regression check inside the project.
