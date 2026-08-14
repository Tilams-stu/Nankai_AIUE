# Goal 8 Live Preflight Check - 2026-07-25

## Scope

This check covers the new real-integration preflight helper:

- `scripts/check_live_integration_prerequisites.ps1`
- `scripts/check_all_live_integrations.ps1`
- `tests/live_integration_prerequisites_check.md`

## Implementation Result

- Added a standalone live preflight command:
  - `scripts/check_live_integration_prerequisites.ps1`
- The preflight validates:
  - presence of required NK-GeniOS credentials
  - in `forward` mode only, presence of required workflow-gateway credentials
  - in `forward` mode only, workflow gateway URL format
  - in `forward` mode only, human-readable gateway origin and auth configuration output
- The combined live bundle now starts with this preflight step.

## Local Verification

Because no real external credentials were provided in this slice, the script was verified through syntax/parse checks only. This is intentional; the helper is designed to fail fast when the required environment is absent.

## Remaining External Requirement

- Real execution still requires the actual external credentials, and workflow gateway settings only when the optional `forward` path is used.
