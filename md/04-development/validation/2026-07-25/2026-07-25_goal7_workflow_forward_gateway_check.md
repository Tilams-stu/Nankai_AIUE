# Goal 7 Workflow Forward Gateway Check - 2026-07-25

## Scope

This check covers the new real-gateway preparation path in `Mental-LLM_JxFdj`:

- `server/proxy_server.py`
- `server/config.example.env`
- `scripts/run_local.md`
- `docs/agent_integration.md`
- `tests/workflow_forward_check.md`

## Implementation Result

- The local workflow gateway now supports a new mode:
  - `MENTAL_LLM_WORKFLOW_GATEWAY_MODE=forward`
- In `forward` mode the local proxy posts the existing workflow payload to a configured internal gateway URL.
- The browser contract remains unchanged:
  - `input`
  - `SEVERITY_LEVEL`
  - `Student_ID`
  - `time`
  - optional `session_snapshot`
- New server-side environment variables:
  - `MENTAL_LLM_WORKFLOW_GATEWAY_URL`
  - `MENTAL_LLM_WORKFLOW_GATEWAY_TIMEOUT_SECONDS`
  - `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_HEADER`
  - `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_SCHEME`
  - `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_TOKEN`
- `/api/workflow/status` now also reports `target_origin`.

## Verification Commands

Run from `D:\Desktop\Software\AIUE\Mental-LLM_JxFdj`.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check_local_audit_gateway.ps1
```

Result: passed with `LOCAL_AUDIT_GATEWAY_PASS`.

```powershell
python -m compileall server
```

Result: passed.

## Acceptance Outcome

- Existing `disabled`, `mock_success`, `mock_failure`, and `local_audit` behavior remains intact.
- The codebase is now ready for a real internal workflow-gateway URL without another browser-contract change.
- Live validation is intentionally separated into `tests/workflow_forward_check.md` because it depends on external gateway access and credentials.

## Residual Risks

- `forward` mode has not been executed against a real gateway in this local-only slice.
- Exact upstream gateway success schema may differ; the local proxy currently preserves upstream JSON when available and normalizes failures to `workflow_gateway_forward_failed`.
