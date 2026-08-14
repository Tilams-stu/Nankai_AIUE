# Goal 8 Structured Upstream Error Check - 2026-07-25

## Scope

This check covers the new structured handling for upstream chat failures:

- `server/proxy_server.py`
- `src/contracts/chatContract.ts`
- `src/services/chatService.ts`
- `src/app/chatRuntime.js`

## Implementation Result

- The local proxy now inspects upstream `chat_query` HTTP error bodies.
- If the upstream message contains `model no permission`, the proxy now emits a structured SSE error payload with:
  - user-facing message
  - `error.code=upstream_model_no_permission`
  - upstream error metadata
  - blocked model ids when present
- The typed chat service now preserves:
  - `message`
  - `statusCode`
  - `errorCode`
- The browser runtime now renders the structured message instead of always falling back to a generic `网络异常...`.

## Verification Commands

Run from `D:\Desktop\Software\AIUE\Mental-LLM_JxFdj`.

```powershell
npm run validate:local
python -m compileall server test_api.py
```

Result: passed.

## Acceptance Outcome

- Real upstream platform failures can now be classified more precisely inside the program.
- The current live blocker `model no permission` has a dedicated in-program diagnosis path rather than only a transient console trace.

## Residual Risks

- The current live upstream classification only explicitly special-cases `model no permission`.
- Additional upstream failure types may still need later dedicated mappings if they become recurring blockers.
