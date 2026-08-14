# Live Integration Prerequisites Check

This check verifies that the environment is ready before attempting real external integrations.

## Command

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check_live_integration_prerequisites.ps1
```

Expected result: `LIVE_INTEGRATION_PREFLIGHT_READY`

## Required Environment

- `NANKAI_API_KEY`
- `NANKAI_BOT_ID`
- optional `MENTAL_LLM_WORKFLOW_GATEWAY_MODE`
- `MENTAL_LLM_WORKFLOW_GATEWAY_URL` only when `MENTAL_LLM_WORKFLOW_GATEWAY_MODE=forward`
- `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_TOKEN` only when `MENTAL_LLM_WORKFLOW_GATEWAY_MODE=forward`

## Validation Scope

- Confirms required environment variables are present.
- In `forward` mode, confirms workflow gateway URL is an absolute `http` or `https` URL.
- In `forward` mode, prints gateway origin, auth header name, auth scheme, and configured timeout for human review.
- In `agent_internal` mode, skips gateway-specific checks.

## Acceptance Notes

- This is a preflight only.
- It does not contact NK-GeniOS or the workflow gateway.
