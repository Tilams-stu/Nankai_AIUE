# Goal 4 Chat Runtime Check - 2026-07-24

## Scope

This check covers the next Goal 4 JavaScript split for `Mental-LLM_JxFdj`: extracting shared chat transport behavior from `index.html` into:

- `src/app/chatRuntime.js`

The active page now loads that script before the remaining legacy inline script and keeps these compatibility wrappers in `index.html`:

- `sendMessage`
- `sendGadMessage`

## Implementation Result

- Shared proxy error parsing moved out of `index.html`.
- Shared request-body assembly moved out of `index.html`.
- Shared input clearing moved out of `index.html`.
- Shared SSE line buffering moved out of `index.html`.
- Shared `[DONE]` handling moved out of `index.html`.
- Shared stream-to-bubble update flow moved out of `index.html`.
- `window.MentalChatRuntime` is the external runtime namespace.
- `scripts/smoke_check.ps1` now verifies `/src/app/chatRuntime.js` returns HTTP 200.
- SSE chunk handling now preserves trailing partial `data:` lines across reads instead of splitting each chunk independently.

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

Result: passed. Existing Vite warnings remain about legacy non-module scripts, unresolved Font Awesome compatibility font URLs, and large bundle size. Vite also reports that `src/app/chatRuntime.js` is a classic script and will not be bundled, which is intentional for this compatibility step.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

## Runtime Verification

Minimal runtime check:

- `window.MentalChatRuntime` exists after evaluating `src/app/chatRuntime.js`.
- `sendConversation()` sends the expected request body to `/api/chat`.
- `sendConversation()` clears the matched input and resets its height.
- `sendConversation()` appends the user bubble and loading bubble when not hidden or silent.
- Cross-chunk SSE content is reassembled correctly before JSON parsing.
- `parseHtml(raw)` is applied to merged stream content before bubble updates.
- Hidden + silent mode still performs the request without appending bubbles.
- Error responses route to the configured fallback bubble HTML.

Result: passed with `CHAT_RUNTIME_PASS`.

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

- Most legacy JavaScript still remains in `index.html`; sound-grid, model mood switching, navigation UI, meditation timers, profile charts, form helpers, message rendering, speech input, model material post-processing, and shared chat transport have been extracted.
- Some view-specific wrappers still remain in `index.html`, including sentiment hook selection and which container or append function each view passes in.
- This check used static inspection, build/smoke checks, and a minimal runtime verification harness. A full desktop/mobile browser regression is still needed before declaring Goal 4 complete.
