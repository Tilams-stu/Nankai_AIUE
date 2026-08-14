# NK-GeniOS Model Permission Troubleshooting

## Current Situation

This note now serves as a fallback troubleshooting reference for model-level permission failures.

Current primary live facts for the project-owned Agent:

- Agent/AppID: `d9fnh7d4shh9f0iucslg`
- `create_conversation`: currently fails before chat generation
- current primary blocker: `Not enabled: API service is disabled`

Historical model-permission blocker from the earlier shared test Agent:

- Agent/AppID: `d4hd19coj60m6gidvts0`
- upstream error:

```text
Internal error: TransChatMessageRequest error: model no permission, modelIDs:["d4rsijjkh9btvj3hmuo0"]
```

That historical error means:

- the API key was usable
- the Bot/AppID was reachable
- that older Agent was configured to use a model that was not permitted for the environment or key

## When To Use This Note

Use this note only if a live run fails with:

- `model no permission`

If the live run fails with:

- `Not enabled: API service is disabled`

then the correct next step is to fix the API publish/channel state first, not the model permission.

## What To Check In NK-GeniOS

Open the `Mental LLM` Agent and inspect the model configuration in the orchestration/editor area.

Look for:

1. The current primary chat model
   - current blocked model id: `d4rsijjkh9btvj3hmuo0`

2. Whether the model is:
   - unpublished
   - team-restricted
   - workspace-restricted
   - removed from your permission scope

3. Whether another available model is already approved in your workspace

## Recommended Fix Order

### Option 1: Re-authorize the current model

Use this if the model is correct for the project and only permission is missing.

Needed result:

- the workspace or API key is granted access to model `d4rsijjkh9btvj3hmuo0`

### Option 2: Replace the model in the Agent

Use this if the current model is not actually required.

Replace it with a model that:

- is visible in your workspace
- is allowed for API calls
- can be used by this Agent in published/runtime state

After replacement:

- republish the Agent if required by the platform

## What Success Looks Like

After fixing the model configuration, rerun:

```powershell
npm run validate:live:chat
```

Expected result:

```text
LIVE_NANKAI_CHAT_PASS
```

## If It Still Fails

Interpretation guide:

- `Not enabled: API service is disabled`
  The Agent API channel is not yet enabled or the latest channel publish has not taken effect. Check the publish page and ensure the API channel is enabled and republished.

- `401` / `403`
  Usually key or Agent access problem.

- `create_conversation` fails
  Usually AppID/BotID, key, or platform access problem.

- `chat_query` fails again with another `model no permission`
  The Agent is still pointing to a blocked model, or another downstream model was selected after publish.

- `chat_query` succeeds but workflow does not write Feishu
  The next blocker is no longer model permission; move to Agent-internal workflow or Feishu permission checks.

## Related Evidence

- `D:\Desktop\Software\AIUE\md\04-development\validation\2026-07-25\2026-07-25_goal8_live_nankai_chat_attempt_check.md`
- `D:\Desktop\Software\AIUE\md\04-development\progress\2026-07-25\2026-07-25_goal8_live_nankai_chat_attempt_log.md`
- `D:\Desktop\Software\AIUE\md\04-development\validation\2026-07-27\2026-07-27_goal8_live_own_agent_attempt_check.md`
- `D:\Desktop\Software\AIUE\md\04-development\progress\2026-07-27\2026-07-27_goal8_live_own_agent_attempt_log.md`
