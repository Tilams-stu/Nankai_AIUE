# Run Local

## Current Prototype

The current active page is still `index.html`.

Before opening the raw prototype through the Python proxy, build the browser-consumable runtime modules:

```powershell
npm run runtime:build
```

Optional workflow gateway modes for local verification:

```powershell
$env:MENTAL_LLM_WORKFLOW_GATEWAY_MODE="agent_internal" # default direct-use path for the current app
$env:MENTAL_LLM_WORKFLOW_GATEWAY_MODE="disabled"      # controlled failure
$env:MENTAL_LLM_WORKFLOW_GATEWAY_MODE="mock_success"  # controlled success
$env:MENTAL_LLM_WORKFLOW_GATEWAY_MODE="mock_failure"  # controlled failure
$env:MENTAL_LLM_WORKFLOW_GATEWAY_MODE="local_audit"   # writes controlled local audit records
$env:MENTAL_LLM_WORKFLOW_GATEWAY_MODE="forward"       # forwards to a real internal workflow gateway
$env:MENTAL_LLM_WORKFLOW_AUDIT_DIR="server/workflow_audit"
```

Real workflow-forwarding environment:

```powershell
$env:MENTAL_LLM_WORKFLOW_GATEWAY_URL="https://your-internal-gateway.example/workflow/report-to-feishu"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_TIMEOUT_SECONDS="20"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_HEADER="Authorization"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_SCHEME="Bearer"
$env:MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_TOKEN="replace_with_gateway_token"
```

Notes:

- `agent_internal` is now the default app path for direct-use handoff. It acknowledges the backend report submission path locally and keeps Feishu confirmation as a manual external check.
- `forward` mode is for a controlled internal gateway only, not direct browser-to-Feishu access.
- If your internal gateway expects another header name or no auth scheme prefix, adjust `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_HEADER` and `MENTAL_LLM_WORKFLOW_GATEWAY_AUTH_SCHEME`.
- `/api/workflow/status` now reports `target_origin` for the configured forward gateway.

Live integration helpers:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check_live_integration_prerequisites.ps1
powershell -ExecutionPolicy Bypass -File scripts/check_live_nankai_chat.ps1
powershell -ExecutionPolicy Bypass -File scripts/check_live_scenario.ps1
powershell -ExecutionPolicy Bypass -File scripts/check_live_workflow_forward.ps1
powershell -ExecutionPolicy Bypass -File scripts/check_all_live_integrations.ps1
npm run validate:live:preflight
npm run validate:live:chat
npm run validate:live:scenario
npm run validate:live:workflow
npm run validate:live
```

Expected results:

- `LIVE_INTEGRATION_PREFLIGHT_READY`
- `LIVE_NANKAI_CHAT_PASS`
- `LIVE_SCENARIO_PASS`
- `LIVE_WORKFLOW_FORWARD_PASS`
- `ALL_LIVE_AUTOMATED_CHECKS_PASS`

Important:

- `ALL_LIVE_AUTOMATED_CHECKS_PASS` only means the scripted live checks passed.
- You still need to manually confirm Agent-internal `report-to-feishu` execution and Feishu row visibility.

## Recommended Handoff Path For Classmates

If another teammate needs to continue testing with the current owned Agent, use this order:

```powershell
$env:NANKAI_BOT_ID="d9fnh7d4shh9f0iucslg"
$env:NANKAI_API_KEY="replace_with_real_key"

npm run validate:local
npm run validate:live:preflight
npm run validate:live:chat
npm run validate:live:scenario
```

Then complete the remaining manual checks:

1. In the published `Mental LLM` Agent, run one synthetic conversation that should clearly reach report generation.
2. Confirm the Agent internally triggered `report-to-feishu`.
3. Confirm a new Feishu row appeared in the expected time window.
4. Confirm the authorized viewer account can actually see that row.
5. Save the evidence in `tests/templates/external_validation_record_template.md`.

Offline full validation bundle:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check_agent_internal_default_path.ps1
powershell -ExecutionPolicy Bypass -File scripts/check_all_local_validations.ps1
npm run validate:local
```

Expected result:

- `ALL_LOCAL_VALIDATIONS_PASS`

## Home PC Helper Scripts

The project includes an ignored `.env` with safe local defaults. Add your real `NANKAI_API_KEY` there, or set it in the current PowerShell session. Then start the build and proxy together:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start_local.ps1
```

Open `http://127.0.0.1:8000/`. Keep that process running, then open a second PowerShell window for the temporary tunnel:

```powershell
ngrok config add-authtoken <YOUR_NGROK_TOKEN>
powershell -ExecutionPolicy Bypass -File scripts/start_ngrok.ps1 -Port 8000
```

The Ngrok URL exposes only this local project port. Stop both processes with `Ctrl+C` after testing and share the temporary URL only with intended testers.

Manual alternative: start the Python proxy from the project folder after setting `NANKAI_API_KEY` in your local environment. The root `proxy_server.py` is a compatibility wrapper around `server/proxy_server.py`.

```powershell
$env:NANKAI_API_KEY="replace_with_server_side_key"
python proxy_server.py
```

Then open:

```text
http://127.0.0.1:8000/
```

Optional port override:

```powershell
$env:MENTAL_LLM_PORT="8765"
python -m server.proxy_server
```

The server serves `index.html` and legacy files from the project root. It also maps root public paths such as `/models/original.glb`, `/images/tubiao.png`, and `/manifest.json` to files under `public/`.

## TypeScript Checks

After installing project dependencies:

```powershell
npm run typecheck
```

Goal 1 does not require switching the active runtime to Vite yet.

## Smoke Check

```powershell
powershell -ExecutionPolicy Bypass -File scripts/smoke_check.ps1
```

The smoke script checks the page, migrated static assets, and the controlled missing-key failure path for `/api/chat`.
