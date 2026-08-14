# Goal 4 Message Runtime Check - 2026-07-24

## Scope

This check covers the next Goal 4 JavaScript split for `Mental-LLM_JxFdj`: extracting message-rendering behavior from `index.html` into:

- `src/app/messageRuntime.js`

The active page now loads that script before the remaining legacy inline script and keeps these compatibility wrappers in `index.html`:

- `appendMsg`
- `appendGadMsg`

## Implementation Result

- Chat message bubble DOM creation moved out of `index.html`.
- GAD-7 message bubble DOM creation moved out of `index.html`.
- Bubble HTML replacement moved out of `index.html`.
- Scroll-to-bottom behavior for message containers moved out of `index.html`.
- `window.MentalMessageRuntime` is the external runtime namespace.
- `scripts/smoke_check.ps1` now verifies `/src/app/messageRuntime.js` returns HTTP 200.

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

Result: passed. Existing Vite warnings remain about legacy non-module scripts, unresolved Font Awesome compatibility font URLs, and large bundle size. Vite also reports that `src/app/messageRuntime.js` is a classic script and will not be bundled, which is intentional for this compatibility step.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

## Runtime Verification

Minimal DOM runtime check:

- `window.MentalMessageRuntime` exists after evaluating `src/app/messageRuntime.js`.
- `appendMessage()` creates a wrapper with class `msg-item <role>`.
- `appendMessage()` returns the created `.bubble` element.
- `appendMessage()` scrolls the target container to the bottom.
- `updateBubbleHtml()` replaces the bubble HTML and scrolls the container to the bottom again.

Result: passed with `MESSAGE_RUNTIME_PASS`.

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

- Most legacy JavaScript still remains in `index.html`; sound-grid, model mood switching, navigation UI, meditation timers, profile charts, form helpers, and message rendering have been extracted.
- Chat sending, GAD-7 sending, SSE parsing, voice input, mobile drag behavior, and model material coloring still remain in `index.html`.
- This check used static inspection, build/smoke checks, and minimal DOM runtime verification. A full desktop/mobile browser visual regression is still needed before declaring Goal 4 complete.
