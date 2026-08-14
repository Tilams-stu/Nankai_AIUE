# Architecture Notes

## Current Shape

`index.html` is still the active prototype entry. It contains layout, styles, interaction logic, model viewing, and chat calls. Goal 1 does not split that file yet.

## Target Shape

- `src/components/`: view rendering and light event binding only.
- `src/services/`: local proxy calls, streaming parsing, timeouts, and error normalization.
  `chatService.ts` and `sessionService.ts` now exist as typed modules.
- `src/domain/`: non-diagnostic session, safety, transcript, and upload states.
- `src/contracts/`: shared TypeScript interfaces for chat and workflow boundaries.
- `src/contracts/sessionSnapshotContract.ts`: shared TypeScript contract for controlled session snapshot export/restore.
- `src/utils/`: small shared pure helpers.
  `sseParser.ts`, `sanitizeText.ts`, and `formatTime.ts` now exist as typed modules.
- `src/domain/session.ts`, `safetyStatus.ts`, `transcript.ts`, `uploadStatus.ts`: non-diagnostic domain state for session identity, safety state, transcript evidence, and report/upload lifecycle.
- `src/styles/legacy-page.css`: active stylesheet entry used by `index.html`.
- `src/styles/base.css`, `layout.css`, `components.css`: split stylesheet layers imported by the active entry.
- `src/app/soundGridRuntime.js`: first extracted browser runtime module. It exposes `window.MentalSoundGrid` and owns the white-noise card list, sound-card rendering, play/pause behavior, and volume updates. `index.html` keeps thin global wrapper functions for compatibility with existing page code.
- `src/app/modelRuntime.js`: extracted browser runtime for model mood switching and `model-viewer` material handling. It exposes `window.MentalModelRuntime`, owns model asset mapping, mood keyword analysis, viewer source updates, status-button active state, model material recoloring, and viewer load-time binding.
- `src/app/navigationRuntime.js`: extracted browser runtime for view visibility, nav-button active state, dark-mode icon/text updates, mobile floating-menu toggling, floating-ball drag handling, and outside-click menu closing.
- `src/app/meditationRuntime.js`: extracted browser runtime for breathing-text timers and simple click pulse feedback in the meditation view.
- `src/app/profileChartRuntime.js`: extracted browser runtime for profile-page Chart.js setup, chart instance ownership, teardown, and refresh after theme changes.
- `src/app/formRuntime.js`: extracted browser runtime for modal UI helpers, textarea auto-resize, Enter-to-send event gating, and settings-form persistence helpers.
- `src/app/messageRuntime.js`: extracted browser runtime for message bubble creation, bubble HTML replacement, and container scroll-to-bottom behavior in chat and GAD views.
- `src/app/speechRuntime.js`: extracted browser runtime for speech-recognition setup, transcript injection into the active textarea, microphone listening UI state, and unsupported-browser fallback.
- `src/app/chatRuntime.js`: extracted browser runtime for shared chat request submission, local proxy error parsing, SSE chunk assembly, and shared stream-to-bubble update flow for chat and GAD views.
- `src/app/sessionRuntime.js`: extracted browser runtime that bridges generated typed session modules into the active page and keeps legacy `CFG` identity values synchronized with typed session state.
- `src/app/statusNoticeRuntime.js`: extracted browser runtime that renders typed non-diagnostic safety and upload state into student-visible page notices.
- `src/app/safetyRuntime.js`: extracted browser runtime that applies conservative, non-diagnostic safety-state patches from explicit conversation text and refreshes typed status notices.
- `src/app/sessionControlRuntime.js`: extracted browser runtime for pause/resume UI state and full session restart UI reset.
- `src/app/loginRuntime.js`: extracted browser runtime for login-modal display, welcome-text updates, typed identity bootstrap, and initial silent intro messages.
- `src/app/uploadRuntime.js`: extracted browser runtime that owns upload-state transitions and can bridge to a future workflow gateway.
- `src/app/uploadDebugRuntime.js`: extracted browser runtime for the localhost-only workflow debug panel, including submission trigger, gateway status text, and audit-summary rendering.
- `src/app/reportDraftRuntime.js`: extracted browser runtime that reads typed transcript state and asks the typed report-draft service to build a backend payload.
- `src/app/pageRuntime.js`: extracted browser runtime that now owns the legacy page entry wiring, global compatibility handlers, and page-level initialization previously left inline in `index.html`.
- `server/`: local proxy implementation, configuration, and Python runtime notes.
- `public/`: static assets used by the active page. The Python proxy maps root public paths such as `/models/...`, `/images/...`, and `/manifest.json` to this folder.

## Boundaries

The browser must not store upstream API keys, call Feishu directly, or display the complete background report to students. The Agent and published workflow own report generation and Feishu upload. Student-facing chat rendering replaces report-like markdown with a short completion notice, while the original content can remain in typed backend handoff state.

Missing information must remain explicit. Domain state should use `unknown`, `not_asked`, `declined`, `refused`, or equivalent non-negative markers instead of silently converting absent data into `no`.

## Proxy Runtime

The root `proxy_server.py` is a compatibility wrapper. The implementation lives in `server/proxy_server.py` and always serves static files from the project root, whether started through the wrapper or with `python -m server.proxy_server`.

The proxy reads `NANKAI_API_KEY` from the server environment and returns generic user-facing errors. Logs should contain request category, upstream status, and elapsed time only.

## Service Runtime

Goal 6 now begins with typed service and utility modules:

- [chatService.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/services/chatService.ts): typed shared local-proxy transport that yields `ChatStreamEvent`.
- [sessionService.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/services/sessionService.ts): typed session-state creation, reset, and identity/control updates.
- [sessionSnapshotService.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/services/sessionSnapshotService.ts): typed session snapshot export/restore helper for controlled handoff without browser persistence.
- [transcriptService.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/services/transcriptService.ts): typed transcript append, update, reset, and filtered listing helper.
- [workflowService.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/services/workflowService.ts): typed workflow-gateway submit helper for future report archival flows.
- [reportDraftService.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/services/reportDraftService.ts): typed backend report-draft builder that converts current state plus typed transcript excerpts into `AgentReportPayload`.
- [workflowContract.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/contracts/workflowContract.ts): typed workflow input and gateway submission package contract, including optional `session_snapshot`.
- [workflowAuditContract.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/contracts/workflowAuditContract.ts): typed summary contract for controlled audit-record listing.
- [workflowAuditService.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/services/workflowAuditService.ts): typed reader for controlled audit-record summaries.
- [sseParser.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/utils/sseParser.ts): preserves trailing partial SSE lines across chunks.
- [sanitizeText.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/utils/sanitizeText.ts): text normalization helpers for future service and domain use.
- [formatTime.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/utils/formatTime.ts): local timestamp helper for later workflow/report use.

These TypeScript modules are emitted for browser consumption through [tsconfig.runtime.json](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/tsconfig.runtime.json) into `public/runtime/`. The current legacy page now consumes the generated `chatService.js` module through `src/app/chatRuntime.js`, the generated `reportDraftService.js` module through `src/app/reportDraftRuntime.js`, and the generated `sessionSnapshotService.js` module through `src/app/sessionRuntime.js`.

## Style Runtime

Goal 4 removes the large inline `<style>` block from `index.html` and loads `./src/styles/legacy-page.css` instead. That entry imports `base.css`, `layout.css`, and `components.css` in original order. No DOM structure or interaction logic is changed in this step.

## Browser Runtime Split

Goal 4 now extracts one isolated JavaScript surface: the white-noise space. The active page loads `./src/app/soundGridRuntime.js` before the remaining legacy inline script. The inline functions `initSoundGrid`, `toggleAudio`, and `adjustVolume` are retained as compatibility wrappers over `window.MentalSoundGrid`, so existing DOM initialization still resolves to the same names while the implementation lives outside `index.html`.

The model mood switching runtime is also extracted into `./src/app/modelRuntime.js`. The active page keeps `changeModel` and `analyzeSentimentAndSwitch` as compatibility wrappers over `window.MentalModelRuntime`; model paths, keyword matching, model material recoloring, and `model-viewer` load-time retry handling no longer live in `index.html`.

The navigation runtime is extracted into `./src/app/navigationRuntime.js`. The active page keeps `switchView`, `toggleDarkMode`, `toggleFloatMenu`, and `handleMobileNav` as compatibility wrappers. Floating-ball drag behavior and the post-drag menu-toggle suppression no longer live in `index.html`. View lifecycle side effects that still depend on legacy local state, such as chart initialization and the GAD-7 opening message, remain in `index.html` for now.

The meditation runtime is extracted into `./src/app/meditationRuntime.js`. The active page keeps `startBreathLoop`, `stopBreathLoop`, and `toggleSound` as compatibility wrappers. Breathing timers no longer live in `index.html`; chart initialization and GAD-7 opening-message behavior remain in the page-level wrapper.

The profile chart runtime is extracted into `./src/app/profileChartRuntime.js`. The active page keeps `initChart` as a compatibility wrapper, and dark-mode toggling asks the chart runtime to refresh existing charts. Chart.js configuration and chart instance state no longer live in `index.html`.

The form runtime is extracted into `./src/app/formRuntime.js`. The active page keeps `handleEnter`, `handleGadEnter`, `openSettings`, and `saveSettings` as compatibility wrappers. Textarea auto-resize bindings and modal backdrop-close handling no longer live in `index.html`, but actual message sending remains in the page-level functions for now.

The message runtime is extracted into `./src/app/messageRuntime.js`. The active page keeps `appendMsg` and `appendGadMsg` as compatibility wrappers, while stream rendering still decides when to call `marked.parse` and when to treat text as an error message. DOM creation and scroll-to-bottom behavior no longer live in `index.html`.

The speech runtime is extracted into `./src/app/speechRuntime.js`. The active page keeps `toggleVoice`, `startListeningUI`, and `stopListeningUI` as compatibility wrappers. Speech-recognition setup, transcript writes to the active input, microphone button/status updates, placeholder switching, and unsupported-browser fallback no longer live in `index.html`.

The chat runtime is extracted into `./src/app/chatRuntime.js`. The active page keeps `sendMessage` and `sendGadMessage` as compatibility wrappers. Shared proxy error parsing, request-body assembly, input clearing, SSE chunk buffering, `[DONE]` handling, and stream-to-bubble update flow no longer live in `index.html`.

The session runtime is extracted into `./src/app/sessionRuntime.js`. The active page now initializes a typed synthetic session, syncs that identity back into the legacy `CFG` object, updates the session view on `switchView`, writes confirmed identity through the typed session service during login, stores transcript entries through the typed transcript service, and can export or restore a controlled in-memory session snapshot without writing sensitive state into browser persistence.

The status notice runtime is extracted into `./src/app/statusNoticeRuntime.js`. The active page now renders typed `safety` and `upload` state into the existing chat headers and profile panel without exposing diagnostic labels or full report content.

The safety runtime is extracted into `./src/app/safetyRuntime.js`. It does not diagnose. It only upgrades typed safety state when the user explicitly denies current self-harm intent, expresses passive disappearance/death wishes, or expresses more direct self-harm or suicide intent. The resulting state is rendered through the existing status notice runtime.

When safety summary moves to `needs_follow_up` or `suggest_real_world_support`, the active page now shows a short non-diagnostic support notice in the chat panels. The notice intentionally avoids fabricated phone numbers or institution-specific claims.

The session control runtime is extracted into `./src/app/sessionControlRuntime.js`. The active page now supports pausing the text inputs, restarting the whole student-side session UI, and exiting back to the login boundary while keeping typed session state in sync.

Login now also writes `consentStatus = accepted` and `userControl = continue` through the typed session bridge instead of only changing legacy globals.

The login runtime is extracted into `./src/app/loginRuntime.js`. The active page keeps `checkLogin`, `saveLoginInfo`, and `updateWelcomeMsg` as compatibility wrappers. Login-modal display, welcome-text rendering, typed identity bootstrap, and the two silent intro messages no longer live in `index.html`.

The upload runtime is extracted into `./src/app/uploadRuntime.js`. It still avoids claiming upload success on its own, but now includes a gateway-facing submit bridge that can move the visible record state from `处理中` to `已提交待确认` or `失败待排查` based on a workflow-gateway response.

When the current session is synthetic, the safety summary reaches `needs_follow_up` or `suggest_real_world_support`, and the local workflow gateway reports itself enabled, the upload runtime may auto-submit a synthetic backend record through that gateway. When the gateway is disabled, the page stays at `处理中` and does not fabricate success.

The workflow-gateway boundary now also accepts an optional typed `session_snapshot` package. The browser still does not write sensitive state into persistence or talk to Feishu directly, but it can now hand the current typed session/safety/transcript/upload state to a controlled local gateway for future backend-owned archival, review, or audit work.

The local proxy now also supports a `local_audit` workflow-gateway mode. In that mode, the gateway writes a controlled JSON audit record under `server/workflow_audit/` or a configured audit directory and returns an `audit_record_path` together with the synthetic run id. This is still a local adapter, not the final institutional backend.

The local proxy now also exposes a controlled read-only audit-summary endpoint at `/api/workflow/audit-records`. It returns only summary fields such as severity, student-id suffix, markdown length, and snapshot metadata, without returning the full workflow request body.

The current page now consumes that summary endpoint through `./src/app/uploadDebugRuntime.js` in the localhost-only developer debug area on the profile view. This is a narrow internal surface for synthetic verification; it is not a student-facing audit console.

The report-draft runtime is extracted into `./src/app/reportDraftRuntime.js`. It reads the current typed session and transcript state from `MentalSessionRuntime` and asks the generated `reportDraftService.js` module to build a non-diagnostic backend payload. This removes report assembly from `index.html` and stops the draft builder from depending on DOM scraping for recent excerpts. By default, the draft includes synthetic student ID but not student name.

The remaining page entry script is now extracted into `./src/app/pageRuntime.js`. The active page still exposes legacy global names such as `sendMessage`, `switchView`, `toggleVoice`, and `saveLoginInfo` for existing HTML handlers, but the initialization, wiring, and orchestration code no longer lives inline in `index.html`.

## Static Asset Runtime

Goal 3 keeps the original root asset files as a rollback baseline, but the active page now references migrated public paths:

- `/models/original.glb`
- `/models/sleep.glb`
- `/models/bachelor.glb`
- `/models/sport.glb`
- `/models/shy.glb`
- `/models/no.glb`
- `/models/thumbsup.glb`
- `/images/tubiao.png`
- `/manifest.json`

## Domain Runtime

Goal 5 begins by introducing typed domain state under `src/domain/` and wiring [appState.ts](D:/Desktop/Software/AIUE/Mental-LLM_JxFdj/src/app/appState.ts) to those models. The current domain baseline separates:

- session identity, consent, and user control
- non-diagnostic safety state with explicit uncertainty
- transcript evidence state for chat and GAD excerpts
- report lifecycle and student-visible upload state
