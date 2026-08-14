# Smoke Check

Current automated smoke scope:

- Directory skeleton exists.
- TypeScript contracts compile.
- Existing `index.html` is not replaced by a generated app.
- No new browser-side API key storage is introduced.
- The Python proxy can serve `index.html`.
- Migrated public asset paths return HTTP 200:
  `/manifest.json`, `/images/tubiao.png`, and all model files under `/models/`.
- Extracted stylesheet entry `/src/styles/legacy-page.css` returns HTTP 200.
- Split stylesheet files `/src/styles/base.css`, `/src/styles/layout.css`, and `/src/styles/components.css` return HTTP 200.
- Extracted white-noise runtime `/src/app/soundGridRuntime.js` returns HTTP 200.
- Extracted model switching and material runtime `/src/app/modelRuntime.js` returns HTTP 200.
- Extracted navigation runtime `/src/app/navigationRuntime.js` returns HTTP 200.
- Extracted meditation runtime `/src/app/meditationRuntime.js` returns HTTP 200.
- Extracted profile chart runtime `/src/app/profileChartRuntime.js` returns HTTP 200.
- Extracted form runtime `/src/app/formRuntime.js` returns HTTP 200.
- Extracted message runtime `/src/app/messageRuntime.js` returns HTTP 200.
- Extracted speech runtime `/src/app/speechRuntime.js` returns HTTP 200.
- Extracted chat runtime `/src/app/chatRuntime.js` returns HTTP 200.
- Extracted session runtime `/src/app/sessionRuntime.js` returns HTTP 200.
- Extracted status notice runtime `/src/app/statusNoticeRuntime.js` returns HTTP 200.
- Extracted safety runtime `/src/app/safetyRuntime.js` returns HTTP 200.
- Extracted session control runtime `/src/app/sessionControlRuntime.js` returns HTTP 200.
- Extracted login runtime `/src/app/loginRuntime.js` returns HTTP 200.
- Extracted upload runtime `/src/app/uploadRuntime.js` returns HTTP 200.
- Extracted upload debug runtime `/src/app/uploadDebugRuntime.js` returns HTTP 200.
- Extracted report draft runtime `/src/app/reportDraftRuntime.js` returns HTTP 200.
- Extracted page entry runtime `/src/app/pageRuntime.js` returns HTTP 200.
- Generated runtime module `/runtime/app/appState.js` returns HTTP 200.
- Generated runtime module `/runtime/contracts/workflowAuditContract.js` returns HTTP 200.
- Generated runtime module `/runtime/contracts/sessionSnapshotContract.js` returns HTTP 200.
- Generated runtime module `/runtime/contracts/workflowContract.js` returns HTTP 200.
- Generated runtime module `/runtime/services/sessionService.js` returns HTTP 200.
- Generated runtime module `/runtime/services/sessionSnapshotService.js` returns HTTP 200.
- Generated runtime module `/runtime/services/transcriptService.js` returns HTTP 200.
- Generated runtime module `/runtime/services/workflowAuditService.js` returns HTTP 200.
- Generated runtime module `/runtime/services/reportDraftService.js` returns HTTP 200.
- Generated runtime module `/runtime/services/workflowService.js` returns HTTP 200.
- Generated runtime modules `/runtime/domain/session.js`, `/runtime/domain/safetyStatus.js`, `/runtime/domain/transcript.js`, and `/runtime/domain/uploadStatus.js` return HTTP 200.
- Generated runtime module `/runtime/services/chatService.js` returns HTTP 200.
- Generated runtime module `/runtime/utils/sseParser.js` returns HTTP 200.
- Generated runtime module `/runtime/utils/sanitizeText.js` returns HTTP 200.
- `/api/chat` returns a controlled missing-key error when `NANKAI_API_KEY` is absent.
- `/api/workflow/status` returns HTTP 200 and reports `mode=disabled`, `enabled=false` when the local gateway is disabled.
- `/api/workflow/audit-records` returns HTTP 200 and includes a `records` field.
- `/api/workflow/report-to-feishu` returns a controlled disabled-gateway error when `MENTAL_LLM_WORKFLOW_GATEWAY_MODE=disabled`.

Current local audit-gateway scope:

- The proxy can start with `MENTAL_LLM_WORKFLOW_GATEWAY_MODE=local_audit`.
- `/api/workflow/report-to-feishu` accepts a synthetic workflow payload plus optional `session_snapshot`.
- The gateway writes a controlled JSON audit record under the configured audit directory.
- The written record uses `workflow_gateway_audit_v1`.
- The record summary indicates whether a snapshot was received and preserves the snapshot schema version.
- `/api/workflow/audit-records` lists the newly written audit summary.
- The audit summary response does not return the full workflow request body.

Commands:

```powershell
npm run typecheck
npm run smoke
powershell -ExecutionPolicy Bypass -File scripts/check_local_audit_gateway.ps1
```

External checks not covered by local smoke:

- Real NK-GeniOS Agent response with an authorized `NANKAI_API_KEY`.
- Published `report-to-feishu` workflow execution.
- Final Feishu base/table record visibility for an authorized table viewer.
