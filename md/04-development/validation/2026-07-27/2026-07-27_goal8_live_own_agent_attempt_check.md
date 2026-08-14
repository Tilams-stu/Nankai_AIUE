# Goal 8 Live Own-Agent Attempt Check - 2026-07-27

## Scope

This check records the first real upstream validation attempt against the project owner's own `Mental LLM` Agent:

- Agent/AppID: `d9fnh7d4shh9f0iucslg`
- Base URL: `https://coze.nankai.edu.cn/api/proxy/api/v1`

## Environment Used

- `NANKAI_API_KEY`: provided by project owner during this session
- `NANKAI_BOT_ID=d9fnh7d4shh9f0iucslg`
- `MENTAL_LLM_WORKFLOW_GATEWAY_MODE=agent_internal`

## Commands Run

```powershell
npm run validate:live:preflight
```

Result: passed with `LIVE_INTEGRATION_PREFLIGHT_READY`

```powershell
npm run validate:live:chat
```

Result: failed.

## Detailed Findings

### 1. Preflight

- Passed.
- Confirms the required live Agent-side environment variables were present.

### 2. `create_conversation`

- Real upstream call failed with HTTP 401.
- Upstream error body identified the blocking cause:

```text
Not enabled: API service is disabled
```

## Conclusion

The project owner's own Agent is now wired into local code, but the API channel is not yet enabled for real upstream use, or the latest channel publish has not taken effect.

This is not a local code failure. It is an NK-GeniOS platform-side publish/channel state problem.

## Next Required Action

In the `Mental LLM` Agent publish page:

1. ensure the API channel is enabled
2. click `渠道发布`
3. wait for the new channel state to take effect

Then rerun:

```powershell
npm run validate:live:chat
```
