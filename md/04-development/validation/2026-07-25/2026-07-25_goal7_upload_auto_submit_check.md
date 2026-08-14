# Goal 7 Upload Auto Submit Check - 2026-07-25

## Scope

This check covers the next Goal 7 step for `Mental-LLM_JxFdj`: automatically attempting a synthetic workflow-gateway submission when typed safety state crosses into a backend-handling threshold.

Files involved:

- `src/app/safetyRuntime.js`
- `src/app/uploadRuntime.js`
- `src/services/workflowService.ts`

## Verified Behavior

- When safety summary becomes `needs_follow_up` and the current session is synthetic:
  - the upload state first moves to `processing`
  - the upload runtime checks `/api/workflow/status`
  - if the gateway is enabled, a synthetic workflow record is auto-submitted
  - on gateway success, the visible state becomes `submitted_pending_confirmation`
- When the gateway is disabled:
  - the upload state still moves to `processing`
  - no synthetic workflow submission is attempted
  - no success is fabricated

Result: passed with `UPLOAD_AUTO_SUBMIT_PASS`.

## Current Limitation

- This path is intentionally limited to synthetic sessions and local gateway availability.
- It is still a prototype bridge, not the final production rule for all report uploads.
