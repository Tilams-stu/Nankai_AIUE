# Goal 4 Profile Chart Runtime Check - 2026-07-24

## Scope

This check covers the next Goal 4 JavaScript split for `Mental-LLM_JxFdj`: extracting profile-page chart behavior from `index.html` into:

- `src/app/profileChartRuntime.js`

The active page now loads that script before the remaining legacy inline script and keeps this compatibility wrapper in `index.html`:

- `initChart`

## Implementation Result

- Radar chart configuration moved out of `index.html`.
- Line chart configuration moved out of `index.html`.
- Chart.js instance ownership moved out of `index.html`.
- Chart teardown and refresh after theme changes moved out of `index.html`.
- `window.MentalProfileChartRuntime` is the external runtime namespace.
- `scripts/smoke_check.ps1` now verifies `/src/app/profileChartRuntime.js` returns HTTP 200.

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

Result: passed. Existing Vite warnings remain about legacy non-module scripts, unresolved Font Awesome compatibility font URLs, and large bundle size. Vite also reports that `src/app/profileChartRuntime.js` is a classic script and will not be bundled, which is intentional for this compatibility step.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

## Runtime Verification

Minimal DOM runtime check:

- `window.MentalProfileChartRuntime` exists after evaluating `src/app/profileChartRuntime.js`.
- `init()` creates exactly 2 charts.
- The first chart config is `radar`.
- The second chart config is `line`.
- Duplicate `init()` does not create duplicate chart instances.
- `refresh()` destroys existing chart instances and creates new ones.
- `destroy()` clears current chart instances.
- `hasChart()` reports chart state correctly.

Result: passed with `PROFILE_CHART_RUNTIME_PASS`.

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

- Most legacy JavaScript still remains in `index.html`; sound-grid, model mood switching, navigation UI, meditation timers, and profile charts have been extracted.
- Settings modal behavior, voice input, chat sending, GAD-7 sending, SSE parsing, message rendering, mobile drag behavior, and model material coloring still remain in `index.html`.
- This check used static inspection, build/smoke checks, and minimal DOM runtime verification. A full desktop/mobile browser visual regression is still needed before declaring Goal 4 complete.
