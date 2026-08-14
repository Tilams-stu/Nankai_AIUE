# Goal 4 Speech Runtime Check - 2026-07-24

## Scope

This check covers the next Goal 4 JavaScript split for `Mental-LLM_JxFdj`: extracting browser speech-input behavior from `index.html` into:

- `src/app/speechRuntime.js`

The active page now loads that script before the remaining legacy inline script and keeps these compatibility wrappers in `index.html`:

- `toggleVoice`
- `startListeningUI`
- `stopListeningUI`

## Implementation Result

- Speech-recognition setup moved out of `index.html`.
- Transcript injection into the active textarea moved out of `index.html`.
- Microphone listening-state UI updates moved out of `index.html`.
- Placeholder switching for listening, idle, and recognition error states moved out of `index.html`.
- Unsupported-browser fallback now lives outside `index.html`.
- `window.MentalSpeechRuntime` is the external runtime namespace.
- `scripts/smoke_check.ps1` now verifies `/src/app/speechRuntime.js` returns HTTP 200.

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

Result: passed. Existing Vite warnings remain about legacy non-module scripts, unresolved Font Awesome compatibility font URLs, and large bundle size. Vite also reports that `src/app/speechRuntime.js` is a classic script and will not be bundled, which is intentional for this compatibility step.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

## Runtime Verification

Minimal DOM runtime check:

- `window.MentalSpeechRuntime` exists after evaluating `src/app/speechRuntime.js`.
- `init()` configures one speech-recognition instance with `lang = zh-CN`, `continuous = false`, and `interimResults = true`.
- `toggleVoice()` starts recognition, marks the active microphone button as listening, shows the active microphone status, and switches the active textarea placeholder to `请说话...`.
- `onresult` writes the transcript into the currently active textarea.
- `onend` stops the listening UI and restores the idle placeholder.
- GAD view switching routes listening state and placeholders to the GAD textarea and microphone UI.
- `onerror` restores the listening UI and sets the active placeholder to `识别出错`.
- Unsupported-browser init hides both microphone buttons.
- Unsupported-browser `toggleVoice()` shows the fallback alert text.

Result: passed with `SPEECH_RUNTIME_PASS`.

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

- Most legacy JavaScript still remains in `index.html`; sound-grid, model mood switching, navigation UI, meditation timers, profile charts, form helpers, message rendering, and speech input have been extracted.
- Chat sending, GAD-7 sending, SSE parsing, mobile drag behavior, and model material coloring still remain in `index.html`.
- This check used static inspection, build/smoke checks, and minimal DOM runtime verification. A full desktop/mobile browser visual regression is still needed before declaring Goal 4 complete.
