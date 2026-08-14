# Data Boundary

## Scope

This document records the current non-diagnostic data boundary for the `Mental-LLM_JxFdj` prototype.

## Current Rules

- The browser must not store upstream API keys.
- Student identity stays in page memory for the active session only.
- Full report content is for background handling and must not be shown to students in full.
- Missing information must remain explicit as `unknown`, `not_asked`, `declined`, `refused`, or other non-negative states. Missing data must never be converted into `no risk`.
- The frontend must not write to Feishu directly.
- The default backend report draft may include synthetic/test student ID for prototype routing, but must not include student name unless a future explicit authorization path is added.
- Until permissions, retention, and consent rules are confirmed, all testing must use synthetic identities and synthetic dialogue.

## Sensitive Data Classes

- Session identity:
  synthetic `userId`, optional `userName`, session id, consent state.
- Safety state:
  non-diagnostic risk summary, uncertainty fields, workflow label.
- Upload state:
  report lifecycle status, workflow run id, report version.
- Report content:
  generated markdown, evidence references, and upload metadata.

## Allowed Browser Persistence

- Allowed:
  local bot-id convenience values such as `school_bot_v2` and `school_gad_bot`.
- Not allowed:
  upstream API keys, student id persistence, student name persistence, or full report content persistence.

## Controlled Snapshot Boundary

- Allowed in memory:
  typed session snapshot export/restore objects used inside the active runtime or passed to a future controlled backend handoff.
- Not allowed:
  automatic browser persistence of snapshot payloads containing student identity, transcript evidence, safety state, or upload state.

## Controlled Local Audit Mode

- Allowed:
  explicit local gateway audit records written by the server-side adapter when `MENTAL_LLM_WORKFLOW_GATEWAY_MODE=local_audit`.
- Not allowed:
  client-side direct persistence of the same audit payloads.

## Outstanding Confirmations

- Final consent text and when it must be shown.
- Real student data retention period.
- Access control for professional report readers.
- Desensitization requirements for stored transcripts and report evidence.
- Real-world support contact list and update owner.
- Whether uploaded report versions require manual review before archival.

## Implementation Notes

- `src/domain/session.ts` models session identity, consent, user control, and information status.
- `src/domain/safetyStatus.ts` models non-diagnostic safety state and keeps uncertainty explicit.
- `src/domain/transcript.ts` models non-diagnostic transcript evidence state.
- `src/domain/uploadStatus.ts` models report lifecycle and student-visible upload state separately.
- `src/app/appState.ts` now uses those domain types as the default app state boundary.
- `src/contracts/sessionSnapshotContract.ts` and `src/services/sessionSnapshotService.ts` now define a controlled export/restore shape without changing current persistence rules.
- `server/proxy_server.py` now supports a controlled `local_audit` mode for server-side audit file writing.
- `src/utils/sanitizeText.ts` now detects report-like markdown so student-facing chat can replace it with a short completion notice.
- `src/services/reportDraftService.ts` now omits student name from the default backend report draft.
