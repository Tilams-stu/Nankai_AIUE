# Current Status Matrix

Date: 2026-07-29

## Purpose

This document is the current source of truth for the project's execution state. It separates:

- local code completion
- local verification completion
- real external validation progress
- current blockers
- next actions

## A. Local Code State

| Area | Status | Evidence |
| --- | --- | --- |
| Frontend structure split | complete | `src/app/pageRuntime.js`, split runtimes under `src/app/`, `index.html` reduced to a thin entry |
| Static assets migration | complete | `public/models/`, `public/images/`, `public/manifest.json` |
| Domain/service/contracts structure | complete | `src/domain/`, `src/services/`, `src/contracts/` |
| Student-side report boundary | complete | `src/utils/sanitizeText.ts`, `src/app/chatRuntime.js` |
| Default report payload minimization | complete | `src/services/reportDraftService.ts` excludes student name by default |
| Workflow contract alignment | complete | `src/contracts/workflowContract.ts` |
| Local workflow fallback paths | complete | `disabled`, `mock_*`, `local_audit`, `forward` supported in `server/proxy_server.py` |
| Structured upstream error handling | complete | `upstream_model_no_permission` path wired through proxy, service, and runtime |
| Conversation policy / natural close | complete | minimum sufficient information, one-off safety prompt, no repeat of recent topics, and summary-confirmed closure are wired through `conversationPolicyService.ts` and `conversationContextService.ts` |
| Session restore / transcript rehydrate | complete | `sessionStorage` snapshot restore plus a 24-hour, hashed-key proxy conversation map in `src/app/sessionRuntime.js` and `server/proxy_server.py`; neither store transcript body in the map |
| Payload traceability | complete | `src/services/workflowService.ts`, `src/contracts/workflowAuditContract.ts`, `src/app/uploadRuntime.js`, `src/app/statusNoticeRuntime.js` |
| Developer debug surface | complete | `src/app/uploadDebugRuntime.js`, `tests/manual/manual_cases.md` |
| Agent prompt source | ready to deploy | `docs/operations/agent_prompt_v2.md` and `D:\Desktop\Software\AIUE\md\01-research\source-material\智能体提示词.md` now match local policy; NK-GeniOS still needs a manual paste and publish |

## B. Local Verification State

| Check | Status | Expected Result |
| --- | --- | --- |
| `npm run typecheck` | passing | TypeScript clean |
| `npm run smoke` | passing | `SMOKE_CHECK_PASS` |
| `scripts/check_local_audit_gateway.ps1` | passing | `LOCAL_AUDIT_GATEWAY_PASS` |
| `scripts/check_forward_workflow_gateway.ps1` | passing | `FORWARD_WORKFLOW_GATEWAY_PASS` |
| `scripts/check_upstream_model_permission_error.ps1` | passing | `UPSTREAM_MODEL_PERMISSION_ERROR_PASS` |
| `npm run validate:local` | passing | `ALL_LOCAL_VALIDATIONS_PASS` |
| `npm run test` | passing | 16 subtests passing, including safety refusal, natural language extraction, policy, restore, and payload mapping coverage |

## C. Real External Validation State

| Step | Status | Current Result |
| --- | --- | --- |
| Live preflight for current owned Agent | passing | `LIVE_INTEGRATION_PREFLIGHT_READY` |
| Live NK-GeniOS chat against owned Agent | passing | `LIVE_NANKAI_CHAT_PASS` |
| Live multi-turn scenario against owned Agent | passing | `LIVE_SCENARIO_PASS` |
| Agent-internal `report-to-feishu` execution | unverified | live chat path is open; workflow trigger itself has not yet been directly evidenced |
| Feishu row visibility | unverified | depends on proving workflow trigger and viewer permission |

## D. Current Owned Agent

| Item | Current Value | Notes |
| --- | --- | --- |
| Primary Agent name | `Mental LLM` | current project-owned candidate |
| Primary AppID / Bot ID | `d9fnh7d4shh9f0iucslg` | now used as the project default |
| Base URL | `https://coze.nankai.edu.cn/api/proxy/api/v1` | confirmed in platform publish view and code |
| Key usage in repo | not persisted | real key is only used in live test environment, not written to source |

## D1. Current teammate-ready test baseline

The following path is now verified for the current owned Agent and can be handed to another teammate as the next-step test baseline:

1. `npm run validate:local`
2. `npm run validate:live:preflight`
3. `npm run validate:live:chat`
4. `npm run validate:live:scenario`

The remaining work after that baseline is still manual external confirmation:

- confirm Agent-internal `report-to-feishu` execution
- confirm Feishu row creation
- confirm row visibility to an authorized viewer

## E. Current Real Blocker

There is no longer a confirmed blocker on the live chat path.

Current remaining unverified area is the post-chat archival path:

- whether the Agent internally triggers `report-to-feishu`
- whether Feishu receives the expected row
- whether the authorized viewer can actually see that row

## F. Not Current Blocker

The following is no longer the active blocker for the current owned Agent:

```text
model no permission
modelIDs:["d4rsijjkh9btvj3hmuo0"]
```

That error belongs to an earlier shared test Agent and is kept only as a troubleshooting reference.

The following is also no longer the active blocker for the current owned Agent:

```text
Not enabled: API service is disabled
```

## G. Next Required Actions

1. Run a synthetic conversation that should clearly trigger backend report handling.
2. Manually confirm inside NK-GeniOS or downstream records that the Agent internally triggered `report-to-feishu`.
3. Confirm the target Feishu base/table received a new row.
4. Confirm the authorized viewer account can actually see that row.
5. Save evidence with `tests/templates/external_validation_record_template.md`.

## H. Completion Rule

The program should be considered locally complete but externally incomplete until all of the following are true:

1. `LIVE_NANKAI_CHAT_PASS`
2. `LIVE_SCENARIO_PASS`
3. Agent-internal `report-to-feishu` is confirmed
4. A real Feishu row is visible to an authorized viewer
5. Real student-data permission, consent, retention, and access constraints are confirmed
