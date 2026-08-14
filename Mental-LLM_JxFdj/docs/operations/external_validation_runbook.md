# External Validation Runbook

## Purpose

This runbook turns the remaining external-only work into a repeatable execution path. It should be used after the local package has already passed:

- `npm run validate:local`

Expected local result:

- `ALL_LOCAL_VALIDATIONS_PASS`

## External Inputs Required

Before running live validation, collect and confirm:

1. NK-GeniOS credentials
   - `NANKAI_API_KEY`
   - `NANKAI_BOT_ID`
   - optional `NANKAI_TEST_USER_ID`
   - optional `MENTAL_LLM_WORKFLOW_GATEWAY_MODE`
   - default expected value for the current prototype: `agent_internal`

2. Agent-side workflow confirmation
   - the real Agent can internally call `report-to-feishu`
   - the intended workflow is published and reachable inside that Agent

3. Feishu visibility
   - target base/table owner confirmation
   - application write permission confirmation
   - viewer account permission confirmation

4. Optional internal workflow gateway
   - `MENTAL_LLM_WORKFLOW_GATEWAY_URL`
   - `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_TOKEN`
   - optional `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_HEADER`
   - optional `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_SCHEME`
   - optional `MENTAL_LLM_WORKFLOW_GATEWAY_TIMEOUT_SECONDS`
   - only needed if you choose to validate or keep the optional `forward` path

5. Business-side approvals
   - real student-data permission
   - consent wording
   - retention / desensitization / access policy
   - real support-resource contact list

## Execution Order

Run the live path in this order.

### Step 1: Preflight

Command:

```powershell
npm run validate:live:preflight
```

Expected:

- `LIVE_INTEGRATION_PREFLIGHT_READY`

If this fails:

- missing or malformed environment variables must be fixed before any live call
- in `agent_internal` mode, workflow gateway URL/token are not required

### Step 2: Live NK-GeniOS Chat

Command:

```powershell
npm run validate:live:chat
```

Expected:

- `LIVE_NANKAI_CHAT_PASS`

What this proves:

- the real API key works
- the bot id is valid
- create_conversation works
- chat_query can return streaming output
- the student-side live connection to the real Agent is available

If this fails:

- 401 / 403 usually means key or permission problem
- create_conversation failure usually means bot id, key, or upstream access problem
- timeout may indicate network or platform instability
- `model no permission`
  means the current Agent is bound to a model that your key or workspace cannot use; see `docs/operations/nkgenios_model_permission_troubleshooting.md`

### Step 3: Live Multi-Turn Scenario

Command:

```powershell
npm run validate:live:scenario
```

Expected:

- `LIVE_SCENARIO_PASS`

What this proves:

- the current owned Agent can sustain a multi-turn conversation
- the current owned Agent is no longer blocked at first-contact API access
- the current prompt/behavior is at least minimally aligned with the student-support use case

This step does not prove workflow execution or Feishu visibility by itself.

### Step 4: Agent-Internal Workflow Confirmation

This step is currently manual because the actual `report-to-feishu` call happens inside the Agent.

Manual check:

1. use the real Agent and complete a synthetic conversation that should trigger report generation
2. confirm the Agent is configured to call `report-to-feishu`
3. confirm a new Feishu row appears in the expected time window
4. capture a timestamp and, if allowed, a screenshot or row identifier

Important:

- this is the primary prototype closure path
- success here is more important than the optional `forward` path
- `npm run validate:live` does not complete this step automatically

### Step 5: Optional Live Workflow Forward

Command:

```powershell
npm run validate:live:workflow
```

Expected:

- `LIVE_WORKFLOW_FORWARD_PASS`

What this proves:

- the local proxy can start in `forward` mode
- the configured gateway URL is reachable from the local machine
- gateway auth is accepted
- the proxy can send the workflow payload shape successfully

Use this only if:

- you still want a separate backend gateway path
- or you need to validate a future non-Agent handoff architecture

When using this step, set:

```powershell
$env:MENTAL_LLM_WORKFLOW_GATEWAY_MODE="forward"
```

If this fails:

- missing `target_origin` usually means forward mode did not start correctly
- HTTP 401 / 403 usually means gateway auth problem
- HTTP 404 / 405 usually means wrong URL or wrong route
- HTTP 502 from local proxy usually means the upstream gateway rejected or failed

### Step 6: Feishu Record Visibility

This step is not yet automated in the local codebase because it depends on account permissions.

Manual check:

1. confirm the Agent-internal workflow or optional forward workflow was triggered
2. confirm the target Feishu base/table received a new row
3. confirm the viewer account can actually see the row
4. capture a timestamp and, if allowed, a screenshot or textual record identifier

Important:

- workflow success does not automatically prove viewer visibility
- viewer visibility failure can be a permission problem even when the write succeeded

## Evidence To Save

For each live run, save:

- date and operator
- which environment variables were provided, without exposing secret values
- command run
- pass / fail result
- relevant HTTP status or error text
- Feishu visibility result

Use:

- `tests/templates/external_validation_record_template.md`

## Decision Rules

Mark external validation complete only when all of the following are true:

1. `LIVE_INTEGRATION_PREFLIGHT_READY`
2. `LIVE_NANKAI_CHAT_PASS`
3. `LIVE_SCENARIO_PASS`
4. if the optional `forward` path is intentionally required, `LIVE_WORKFLOW_FORWARD_PASS`
5. the Agent-internal `report-to-feishu` path is confirmed working, or the optional forward path is confirmed if that architecture is intentionally required
6. a real Feishu row is confirmed visible to an authorized viewer
7. real data / consent / access constraints are explicitly confirmed

Until then, the project remains locally complete but externally unverified.
