# Goal 8 Model Permission Troubleshooting Check - 2026-07-25

## Scope

This check covers the new troubleshooting guidance for the current real upstream blocker:

- `docs/nkgenios_model_permission_troubleshooting.md`
- `docs/external_validation_runbook.md`
- `README.md`

## Implementation Result

- Added a focused troubleshooting note for the live `chat_query` failure against `Mental LLM`.
- The document records the current blocked model id:
  - `d4rsijjkh9btvj3hmuo0`
- The runbook now explicitly routes `model no permission` errors to that troubleshooting document.

## Acceptance Outcome

- The current live blocker is no longer only present in transient test output; it is now captured as a project troubleshooting asset.
- The next operator can act on the exact model-permission issue without reconstructing it from console logs.
