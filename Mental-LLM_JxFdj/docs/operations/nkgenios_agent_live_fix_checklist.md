# NK-GeniOS Agent Live Fix Checklist

## Current Live Blocker

The current project-owned `Mental LLM` Agent does not yet pass the live API path.

Confirmed Agent/AppID:

- `d9fnh7d4shh9f0iucslg`

Confirmed upstream blocker:

- `Not enabled: API service is disabled`

## Goal

Make the `Mental LLM` Agent pass:

```powershell
npm run validate:live:chat
```

Expected result:

- `LIVE_NANKAI_CHAT_PASS`

## Platform-Side Checklist

### 1. Open the correct Agent

Open:

- `Mental LLM`
- AppID should match `d9fnh7d4shh9f0iucslg`

Do not edit other historical agents unless you confirm they are now the active production-like candidate.

### 2. Check the API channel first

On the publish page, verify:

- the `API` channel is enabled
- the latest channel configuration has been published
- the published state has actually taken effect

If this is not done, live chat can fail before model execution with:

```text
Not enabled: API service is disabled
```

### 3. Only if API is already enabled and live chat still fails

Then move on to the model selection area used for normal chat generation.

Check:

- current selected model
- whether it is available in your current workspace
- whether it is still published or team-usable

If the error becomes `model no permission`, then you have two valid fixes:

1. Grant permission to the current model.
2. Replace it with another model that your current API key / workspace is allowed to use.

Prefer the second option if:

- you already see an available model in the dropdown
- the blocked model is from an old team/workspace
- the blocked model is no longer maintained

### 4. Publish the Agent again

If NK-GeniOS requires publishing after changing the model:

- save the edit
- republish the Agent

Without republishing, API/runtime traffic may still use the old blocked model.

### 5. Re-run live validation

After changing the model:

```powershell
npm run validate:live:chat
```

If this passes, continue with:

1. a synthetic real conversation in the Agent
2. check whether `report-to-feishu` is triggered internally
3. verify Feishu row visibility

## Fast Failure Interpretation

If live chat still fails:

- `Not enabled: API service is disabled`
  The API channel is not enabled yet, or the latest `渠道发布` has not taken effect.

- `model no permission`
  The Agent is still pointing to a blocked model, or the replacement model also lacks permission.

- `401` / `403`
  API key or Agent access issue.

- `create_conversation` fails
  Usually AppID/key mismatch or platform access issue.

- `chat_query` succeeds
  The blocker is no longer model permission. Move to workflow and Feishu validation.

## After Fixing

Save evidence in:

- `tests/templates/external_validation_record_template.md`

And update the current live test result file or add a new one under:

- `D:\Desktop\Software\AIUE\md\04-development\validation\`
