# External Validation Record Template

## Metadata

- Date:
- Operator:
- Environment:
- Purpose:

## Inputs Confirmed

- `NANKAI_API_KEY`: present / absent
- `NANKAI_BOT_ID`: present / absent
- `MENTAL_LLM_WORKFLOW_GATEWAY_MODE`: `agent_internal` / `forward` / absent
- `MENTAL_LLM_WORKFLOW_GATEWAY_URL`: present / absent / not needed
- `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_TOKEN`: present / absent / not needed
- Real student-data permission: confirmed / not confirmed
- Feishu viewer permission: confirmed / not confirmed

## Step 1: Preflight

- Command:
  `npm run validate:live:preflight`
- Result:
- Notes:

## Step 2: Live NK-GeniOS Chat

- Command:
  `npm run validate:live:chat`
- Result:
- Observed output summary:
- Error or status detail:

## Step 3: Live Multi-Turn Scenario

- Command:
  `npm run validate:live:scenario`
- Result:
- Observed output summary:
- Error or status detail:

## Step 4: Agent-Internal Workflow Confirmation

- Command:
  manual check after a synthetic real conversation in the `Mental LLM` Agent
- Result:
- Was `report-to-feishu` triggered internally: yes / no / unknown
- Feishu row created in expected time window: yes / no / unknown
- Notes:

## Step 5: Optional Live Workflow Forward

- Command:
  `npm run validate:live:workflow`
- Result:
- Observed output summary:
- Error or status detail:

## Step 6: Feishu Visibility

- Target base/table:
- Expected record identifier or time window:
- Row visible to authorized viewer: yes / no
- Evidence captured:
- Notes:

## Conclusion

- Automated live bundle result:
  `ALL_LIVE_AUTOMATED_CHECKS_PASS` / other
- External validation complete: yes / no
- Blocking issue:
- Next action:
