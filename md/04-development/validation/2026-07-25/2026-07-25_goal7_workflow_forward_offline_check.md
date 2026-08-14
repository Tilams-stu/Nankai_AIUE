# Goal 7 Workflow Forward Offline Check - 2026-07-25

## Scope

This check verifies the new `forward` workflow-gateway mode without requiring an external gateway:

- `server/proxy_server.py`
- `server/mock_workflow_gateway.py`
- `scripts/check_forward_workflow_gateway.ps1`

## Implementation Result

- A local fake upstream workflow gateway now exists at `server/mock_workflow_gateway.py`.
- The new script `scripts/check_forward_workflow_gateway.ps1` starts:
  - the fake upstream gateway
  - the local proxy in `MENTAL_LLM_WORKFLOW_GATEWAY_MODE=forward`
- The script verifies:
  - `/api/workflow/status` reports `mode=forward`
  - `/api/workflow/status` reports `enabled=true`
  - `/api/workflow/status` reports the configured `target_origin`
  - `/api/workflow/report-to-feishu` forwards the payload and relays upstream success fields

## Verification Commands

Run from `D:\Desktop\Software\AIUE\Mental-LLM_JxFdj`.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check_forward_workflow_gateway.ps1
```

Result: passed with `FORWARD_WORKFLOW_GATEWAY_PASS`.

```powershell
python -m compileall server
```

Result: passed.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

## Acceptance Outcome

- The local proxy `forward` adapter is now proven offline, not just present in code.
- Existing smoke and local-audit checks still pass after the new forward path was added.
- The remaining unknown is now only the real external gateway contract and permissions.

## Residual Risks

- This offline check proves local forwarding behavior, not the live internal workflow endpoint.
- A real gateway may require different auth headers, timeout behavior, or response schema fields than the local mock.
