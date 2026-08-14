# Goal 8 Live Integration Bundle Check - 2026-07-25

## Scope

This check covers the new bundle script for future real integration:

- `scripts/check_all_live_integrations.ps1`
- `scripts/check_live_nankai_chat.ps1`
- `scripts/check_live_workflow_forward.ps1`

## Implementation Result

- Added a single top-level PowerShell entry:
  - `scripts/check_all_live_integrations.ps1`
- The bundle runs:
  1. live integration preflight
  2. live NK-GeniOS chat verification
  3. live workflow forward verification only when `MENTAL_LLM_WORKFLOW_GATEWAY_MODE=forward`
- Expected final success marker:
  - `ALL_LIVE_AUTOMATED_CHECKS_PASS`

## Local Verification

- Script file created and referenced from `README.md`, `scripts/run_local.md`, and `tests/live_nankai_chat_check.md`.
- No external run was attempted in this local-only slice because the required credentials and gateway access are still absent.

## Remaining External Requirement

- Real execution still depends on valid:
  - `NANKAI_API_KEY`
  - `NANKAI_BOT_ID`
  - workflow gateway URL and auth token only when the optional `forward` path is used
- Even after the automated bundle passes, Agent-internal workflow execution and Feishu row visibility still require manual confirmation.
