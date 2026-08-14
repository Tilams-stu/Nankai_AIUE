# Goal 4 Form Runtime Check - 2026-07-24

## Scope

This check covers the next Goal 4 JavaScript split for `Mental-LLM_JxFdj`: extracting form-helper behavior from `index.html` into:

- `src/app/formRuntime.js`

The active page now loads that script before the remaining legacy inline script and keeps these compatibility wrappers in `index.html`:

- `handleEnter`
- `handleGadEnter`
- `openSettings`
- `saveSettings`

## Implementation Result

- Enter-to-send gating moved out of `index.html`.
- Textarea auto-resize binding moved out of `index.html`.
- Settings modal open/reset behavior moved out of `index.html`.
- Settings modal backdrop-close behavior moved out of `index.html`.
- Bot ID persistence helper logic moved out of `index.html`.
- `window.MentalFormRuntime` is the external runtime namespace.
- `scripts/smoke_check.ps1` now verifies `/src/app/formRuntime.js` returns HTTP 200.

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

Result: passed. Existing Vite warnings remain about legacy non-module scripts, unresolved Font Awesome compatibility font URLs, and large bundle size. Vite also reports that `src/app/formRuntime.js` is a classic script and will not be bundled, which is intentional for this compatibility step.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

## Runtime Verification

Minimal DOM runtime check:

- `window.MentalFormRuntime` exists after evaluating `src/app/formRuntime.js`.
- `handleEnterSubmit()` prevents default and calls the provided submit callback on plain Enter.
- `handleEnterSubmit()` does not submit on `Shift+Enter`.
- `bindAutoResize()` sets empty textarea height to `44px`.
- `bindAutoResize()` grows the textarea to its `scrollHeight` when content exists.
- `openSettings()` opens the modal, clears API key inputs, and injects the current bot IDs.
- `saveSettings()` updates `CFG.BOT` and `CFG.GAD_BOT`, writes `school_bot_v2` and `school_gad_bot` to `localStorage`, and closes the modal.
- `bindModalBackdropClose()` closes the modal when the modal backdrop itself is clicked.

Result: passed with `FORM_RUNTIME_PASS`.

## Security Scan

Targeted scan:

```powershell
rg -n "Authorization|targetKey|requests\.|import requests|localStorage\.setItem\('school_(key_v2|gad_key|student_id|student_name)'" index.html proxy_server.py server test_api.py src docs tests scripts README.md .env.example server\config.example.env
```

Result: no active frontend credential path found. Matches were documentation text only:

- `tests/api_check.md`: states that browser requests should not include upstream authorization headers.
- `docs/static_assets.md`: mentions smoke/build commands.

## Cleanup

`dist/` and Python `__pycache__/` remain generated verification artifacts in the project directory. They should be removed before final packaging when deletion is allowed.

## Residual Risks

- Most legacy JavaScript still remains in `index.html`; sound-grid, model mood switching, navigation UI, meditation timers, profile charts, and form helpers have been extracted.
- Voice input, message rendering, chat sending, GAD-7 sending, SSE parsing, mobile drag behavior, and model material coloring still remain in `index.html`.
- This check used static inspection, build/smoke checks, and minimal DOM runtime verification. A full desktop/mobile browser visual regression is still needed before declaring Goal 4 complete.
