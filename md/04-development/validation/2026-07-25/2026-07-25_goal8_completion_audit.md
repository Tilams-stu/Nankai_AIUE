# Goal 8 Completion Audit - 2026-07-25

## Scope

This audit checks whether the work before Goal 8 left unfinished items against the unique roadmap:

- `roadmap/2026-07-24_Mental-LLM项目代码制作完整计划.md`
- project code under `Mental-LLM_JxFdj`
- accumulated evidence under `testing/` and `progress/`

## Progress Position Found

The project had concrete evidence through Goal 7 before this audit:

- Goal 0: security baseline and credential gate.
- Goal 1: skeleton and TypeScript contracts.
- Goal 2: server-side proxy consolidation.
- Goal 3: static asset migration.
- Goal 4: CSS and browser runtime extraction slices.
- Goal 5: domain state, safety boundary, login/session controls, transcript, snapshot.
- Goal 6: typed chat/SSE service and generated browser runtime modules.
- Goal 7: workflow contract, report draft, upload runtime, local audit gateway, audit summaries, debug panel.

No prior Goal 8 root-level testing evidence existed before this audit.

## Unfinished Items Found And Fixed

### 1. Student-facing report leakage guard

Finding:

- `src/app/chatRuntime.js` streamed and rendered raw Agent text.
- If an Agent returned full report-like markdown such as `# 一、主诉`, the student-side chat could display it.
- This conflicted with the roadmap rule that students must not see the complete background report.

Fix:

- Added `isReportLikeContent()` and `studentFacingReportPlaceholder()` in `src/utils/sanitizeText.ts`.
- Updated `src/app/chatRuntime.js` to replace report-like markdown with a short completion notice before rendering.
- Kept the original Agent content available for controlled transcript/backend handoff.

### 2. Default report payload included student name

Finding:

- `src/services/reportDraftService.ts` wrote `Student Name` into backend report markdown by default.
- The roadmap says `user_name` is not report-required and should not be written to reports or ordinary logs without explicit authorization.

Fix:

- Removed the `Student Name` metadata line from the default report draft payload.
- Updated data-boundary and architecture documentation to record this rule.

## Current Local Verification

Commands run from `D:\Desktop\Software\AIUE\Mental-LLM_JxFdj`:

```powershell
npm run typecheck
python -m compileall server
npm run runtime:build
npm run smoke
powershell -ExecutionPolicy Bypass -File scripts/check_local_audit_gateway.ps1
```

Results:

- `npm run typecheck`: passed.
- `python -m compileall server`: passed.
- `npm run runtime:build`: passed.
- `npm run smoke`: passed with `SMOKE_CHECK_PASS`.
- `scripts/check_local_audit_gateway.ps1`: passed with `LOCAL_AUDIT_GATEWAY_PASS`.

Additional source check:

```powershell
rg -n "Student Name|studentFacingReportPlaceholder|isReportLikeContent" src public\runtime docs tests
```

Result:

- `Student Name` remains only in manual-case documentation as a prohibited field.
- Generated runtime includes the new report-like content guard.

## Additional Progress After Initial Audit

After the first Goal 8 audit, the project continued to close local-only gaps:

- Goal 4 page-entry extraction was completed through `src/app/pageRuntime.js`.
- `index.html` was reduced from about 798 lines to 354 lines.
- Student-facing mojibake text was cleaned up in the active UI.
- The workflow gateway gained a real `forward` mode for controlled server-side forwarding.
- `forward` mode now has both:
  - an offline adapter proof through `FORWARD_WORKFLOW_GATEWAY_PASS`
  - live-integration helper scripts for future authorized runs
- The intended real closure path was clarified: the Agent can internally call `report-to-feishu`, so the optional gateway path is not a required blocker for the main prototype closure.

Additional evidence created after the initial audit:

- `testing/2026-07-25_goal4_page_runtime_check.md`
- `testing/2026-07-25_goal7_workflow_forward_gateway_check.md`
- `testing/2026-07-25_goal7_workflow_forward_offline_check.md`
- `testing/2026-07-25_goal8_ui_text_cleanup_check.md`
- `testing/2026-07-25_goal8_live_integration_helper_check.md`
- `testing/2026-07-25_goal8_live_integration_bundle_check.md`
- `testing/2026-07-25_goal8_local_validation_bundle_check.md`
- `testing/2026-07-25_goal8_all_local_validations_check.md`
- `testing/2026-07-25_goal8_npm_validation_entry_check.md`
- `testing/2026-07-25_goal8_model_permission_error_path_check.md`

## Goal-by-Goal Audit Summary

| Goal | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Goal 0 | Locally complete | `testing/2026-07-24_goal0_security_check.md`, baseline manifest, current scan | External key rotation still must be confirmed outside code. |
| Goal 1 | Complete | `testing/2026-07-24_goal1_skeleton_check.md`, `src/`, `docs/`, `tests/`, TS config | `.codex/references/` was checked and not present. |
| Goal 2 | Complete | `testing/2026-07-24_goal2_proxy_check.md`, `server/proxy_server.py`, smoke pass | Proxy keeps upstream key server-side. |
| Goal 3 | Complete | `testing/2026-07-24_goal3_static_assets_check.md`, public asset paths, smoke pass | Old root assets remain as rollback baseline. |
| Goal 4 | Complete | Goal 4 testing files, `src/app/pageRuntime.js`, `testing/2026-07-25_goal4_page_runtime_check.md`, smoke pass | Original hard gate `index.html < 400` is now satisfied; current file is 354 lines. |
| Goal 5 | Complete for local prototype | Goal 5 testing files, domain modules, data boundary docs | Real support-resource contacts remain external pending confirmation. |
| Goal 6 | Complete for local typed service path | Goal 6 testing files, `chatService.ts`, `sseParser.ts`, generated runtime modules | Real NK-GeniOS stream still needs authorized live-key check. |
| Goal 7 | Complete for local workflow/audit prototype | Goal 7 testing files, `workflowService.ts`, `reportDraftService.ts`, `testing/2026-07-25_goal7_workflow_forward_gateway_check.md`, `testing/2026-07-25_goal7_workflow_forward_offline_check.md`, local audit + forward offline pass | The primary real closure path is now Agent-internal workflow invocation; published workflow success and final Feishu visibility remain external. |
| Goal 8 | Now locally complete | This audit, expanded manual cases, `testing/2026-07-25_goal8_ui_text_cleanup_check.md`, `testing/2026-07-25_goal8_live_integration_helper_check.md`, `testing/2026-07-25_goal8_all_local_validations_check.md`, `testing/2026-07-25_goal8_model_permission_error_path_check.md`, smoke/audit/full-local-bundle/error-path pass, presentation notes | External checks remain explicitly out of local-only validation. |

## Remaining Not-Local Completion Items

These are not complete because they require external permission, institutional confirmation, or a deliberate next roadmap:

- Confirm previously exposed NK-GeniOS API keys were rotated in the upstream platform.
- Verify the real Agent can internally call the published `report-to-feishu` workflow in the live environment.
- Verify Feishu table/base record visibility with an authorized table viewer.
- Confirm real student-data consent wording, retention period, access control, and desensitization rules.
- Confirm real school psychological support contact list and update owner.
## Audit Conclusion

The local prototype goals 0-8 are now in a handoff-ready state with the original Goal 4 page-size gate also satisfied, and the entire local validation package can now be executed either through one PowerShell command or through `npm run validate:local`, both yielding `ALL_LOCAL_VALIDATIONS_PASS`. The code should not be described as a production or live institutional closure until the external items are verified.
