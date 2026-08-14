# Goal 4 Model Runtime Check - 2026-07-24

## Scope

This check covers the next Goal 4 JavaScript split for `Mental-LLM_JxFdj`: extracting model mood switching from `index.html` into:

- `src/app/modelRuntime.js`

The active page now loads that script before the remaining legacy inline script and keeps these compatibility wrappers in `index.html`:

- `changeModel`
- `analyzeSentimentAndSwitch`

## Implementation Result

- Model asset paths moved out of `index.html`.
- Current mood state moved out of `index.html`.
- Keyword-to-mood matching moved out of `index.html`.
- Status-button active-state updates moved out of `index.html`.
- `window.MentalModelRuntime` is the external runtime namespace.
- `scripts/smoke_check.ps1` now verifies `/src/app/modelRuntime.js` returns HTTP 200.

## Verification Commands

Run from `D:\Desktop\Software\AIUE\Mental-LLM_JxFdj`.

```powershell
python -m compileall proxy_server.py server test_api.py
```

Result: passed.

```powershell
npm run typecheck
```

Result: passed.

```powershell
npm run build
```

Result: passed. Existing Vite warnings remain about legacy non-module scripts and large bundle size. Vite also reports that `src/app/modelRuntime.js` is a classic script and will not be bundled, which is intentional for this compatibility step.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

## Runtime Verification

Minimal DOM runtime checks:

- `window.MentalModelRuntime` exists after evaluating `src/app/modelRuntime.js`.
- English keyword input `yes good` maps to `thumbsup`.
- `changeModel('sleep')` updates both `#lion-viewer` and `#gad-lion-viewer` to `/models/sleep.glb`.
- The matching status button receives the `active` class.
- Unicode-escaped Chinese input `最近压力很大，作业很多` maps to `study`.
- The study mood updates both viewers to `/models/bachelor.glb`.

Results:

- `MODEL_RUNTIME_PASS mood=sleep`
- `MODEL_RUNTIME_UNICODE_PASS mood=study`

## Security Scan

Targeted scan:

```powershell
rg -n "Authorization|targetKey|requests\.|import requests|localStorage\.setItem\('school_(key_v2|gad_key|student_id|student_name)'" index.html proxy_server.py server test_api.py src docs tests scripts README.md .env.example server\config.example.env
```

Result: no active frontend credential path found. Matches were documentation text only:

- `docs/static_assets.md`: mentions smoke/build commands.
- `tests/api_check.md`: states that browser requests should not include upstream authorization headers.

## Cleanup

`dist/` and Python `__pycache__/` remain generated verification artifacts in the project directory. They should be removed before final packaging when deletion is allowed.

## Residual Risks

- Most legacy JavaScript still remains in `index.html`; only sound-grid and model mood runtimes have been extracted.
- This step used minimal DOM runtime verification rather than a full browser visual regression because the browser execution tool was not available in this continuation.
