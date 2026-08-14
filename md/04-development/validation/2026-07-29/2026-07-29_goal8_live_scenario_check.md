# Goal 8 Live Scenario Check - 2026-07-29

## Scope

This check verifies a real multi-turn synthetic conversation against the current project-owned Agent:

- Agent/AppID: `d9fnh7d4shh9f0iucslg`
- Command: `npm run validate:live:scenario`

## Result

Passed with:

```text
LIVE_SCENARIO_PASS
```

## What Was Proven

- The real upstream Agent can create a conversation.
- The real upstream Agent can handle multiple chat turns in one conversation.
- The Agent can return coherent onboarding and support-oriented dialogue instead of failing on first contact.
- The current owned Agent is no longer blocked by:
  - `API service is disabled`
  - `model no permission`

## Remaining Not Yet Proven

- Agent-internal `report-to-feishu` execution
- Feishu row visibility to an authorized viewer
- Real-data consent and access controls
