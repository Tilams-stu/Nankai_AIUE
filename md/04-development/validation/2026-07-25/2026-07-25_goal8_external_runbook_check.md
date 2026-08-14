# Goal 8 External Runbook Check - 2026-07-25

## Scope

This check covers the new project-internal runbook for real external validation:

- `docs/external_validation_runbook.md`
- `tests/external_validation_record_template.md`
- `README.md`

## Implementation Result

- External validation is now documented as a repeatable runbook instead of being spread across chat history.
- The runbook defines:
  - required external inputs
  - execution order
  - failure interpretation
  - evidence to save
  - final completion criteria
- A reusable evidence template now exists for future live runs.

## Acceptance Outcome

- After credentials are available, operators can execute the live path without reconstructing steps from prior conversation.
- The remaining work is now clearly separated into:
  - local verified code and scripts
  - external run execution and evidence capture
