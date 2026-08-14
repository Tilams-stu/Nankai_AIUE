# Goal 7 Audit Summary Check - 2026-07-25

## Scope

This check covers the controlled audit-summary read path in `Mental-LLM_JxFdj`:

- `server/proxy_server.py`
- `src/contracts/workflowAuditContract.ts`
- `src/services/workflowAuditService.ts`
- `src/app/uploadRuntime.js`

## Implementation Result

- The local proxy now exposes `/api/workflow/audit-records`.
- The endpoint returns summary-only records rather than full workflow request bodies.
- The browser runtime now has a typed audit-summary reader through `workflowAuditService.ts` and `MentalUploadRuntime.listAuditRecords(...)`.
- The localhost-only developer debug area now renders recent audit summaries.

## Verification Commands

Run from `D:\Desktop\Software\AIUE\Mental-LLM_JxFdj`.

```powershell
npm run typecheck
```

Result: passed.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check_local_audit_gateway.ps1
```

Result: passed with `LOCAL_AUDIT_GATEWAY_PASS`.

## Verified Evidence

- `/api/workflow/audit-records` returns HTTP 200
- response includes `records`
- newest summary record matches the newly created local audit file
- summary route does not need to return the full request payload
- the existing profile debug panel can request and render summary rows without affecting smoke checks

## Residual Risks

- The current summary route is still local-only and server-trust-based.
- Access control for any future nonlocal audit-summary reader still needs explicit policy.
- The current UI surface is developer-only and still not a staff-facing review tool.
