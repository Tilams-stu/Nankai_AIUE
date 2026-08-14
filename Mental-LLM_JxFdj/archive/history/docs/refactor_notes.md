# Refactor Notes

## Goal 0

Created a baseline manifest and removed the most direct credential/data persistence risks.

## Goal 1

Creates the directory skeleton, TypeScript configuration, and initial interface contracts. It intentionally keeps `index.html` as the active runtime surface to avoid behavior changes before tests and asset migration are ready.

## Goal 2

Moves the proxy implementation into `server/proxy_server.py`, keeps `proxy_server.py` as a compatibility wrapper, fixes static root serving, and adds a local smoke test for page loading plus missing-key error handling.

## Goal 3

Copies browser-facing assets into `public/`, updates the page to use stable public URLs, and keeps the original root files as a rollback baseline.

## Goal 4

Starts the view/style split by extracting the original inline `<style>` block from `index.html` into `src/styles/legacy-page.css`. The stylesheet is then split into `base.css`, `layout.css`, and `components.css`, with `legacy-page.css` kept as the single HTML entry through ordered imports. This reduces the active HTML file size and starts CSS layering without changing DOM structure or JavaScript behavior.

The next Goal 4 slice extracts the white-noise sound grid runtime into `src/app/soundGridRuntime.js`. This keeps the scope small: sound data, card rendering, play/pause toggling, and volume updates move out of `index.html`, while the original global function names remain as wrappers for compatibility.

The following Goal 4 slice extracts model mood switching into `src/app/modelRuntime.js`. Model asset paths, current mood state, status-button active state, keyword-to-mood matching, `model-viewer` load-time retry handling, and material recoloring now live in the external runtime. `index.html` keeps `changeModel` and `analyzeSentimentAndSwitch` as thin wrappers so existing button handlers and chat callbacks continue to work.

The next slice extracts navigation UI behavior into `src/app/navigationRuntime.js`. View visibility, navigation active state, dark-mode UI text/icon updates, mobile floating-menu toggling, mobile navigation lookup, outside-click menu closing, and floating-ball drag suppression now live outside `index.html`. Legacy lifecycle effects remain in the `switchView` wrapper until chart and GAD-7 modules are separated.

The next slice extracts meditation behavior into `src/app/meditationRuntime.js`. Breathing text timers and simple sound-card pulse feedback now live outside `index.html`. The `switchView` wrapper still decides when to start or stop the breathing loop because it also coordinates chart and GAD-7 view lifecycle effects.

The next slice extracts profile chart behavior into `src/app/profileChartRuntime.js`. Radar and line chart configuration, Chart.js instance state, teardown, and refresh after theme changes now live outside `index.html`. The page-level `initChart` wrapper remains so `switchView('profile')` can keep its legacy lifecycle call.

The next slice extracts form helper behavior into `src/app/formRuntime.js`. Enter-to-send gating, textarea auto-resize, settings-modal open/close handling, and bot-id persistence helpers now live outside `index.html`. Actual `sendMessage` and `sendGadMessage` implementations still remain in the page script.

The next slice extracts message rendering behavior into `src/app/messageRuntime.js`. Message bubble creation, bubble HTML replacement, and scroll-to-bottom behavior now live outside `index.html`. The page-level chat functions still own network requests, SSE parsing, and markdown parsing decisions.

The next slice extracts speech-input behavior into `src/app/speechRuntime.js`. Speech-recognition setup, transcript injection, listening-state UI changes, and unsupported-browser fallback now live outside `index.html`. Actual chat sending and downstream conversation handling remain in the page script.

The next slice extracts shared chat transport behavior into `src/app/chatRuntime.js`. Proxy error parsing, request-body assembly, input clearing, SSE line buffering, `[DONE]` handling, and shared stream-to-bubble update flow now live outside `index.html`. The page still decides view-specific hooks such as sentiment analysis and which container or append function to use.

## Deferred

- Continue refining `components.css` into narrower component files once browser visual regression is stronger.
- Split legacy page JavaScript into services, components, and utilities after a safer module strategy is defined.
- Add domain models for safety and upload status.
- Connect contracts to runtime services.

## Goal 5

Goal 5 now starts with typed non-diagnostic state under `src/domain/`. Session identity, consent, safety state, upload lifecycle, and the current app state boundary are no longer only roadmap text; they are represented as TypeScript code and documented in `docs/architecture/data_boundary.md`.

The next Goal 5 slice bridges that typed session state back into the active page through `src/app/sessionRuntime.js`. The runtime loads generated `appState.js` and `sessionService.js`, initializes a synthetic session, syncs identity into the legacy `CFG`, and updates typed session state during login and view changes.

The next Goal 5 slice renders typed safety and upload state back into the active page through `src/app/statusNoticeRuntime.js`. This keeps the student-facing output non-diagnostic while proving that typed domain state is not only stored, but also consumed by the live UI.

The next Goal 5 slice updates typed safety state from explicit conversation content through `src/app/safetyRuntime.js`. The runtime applies conservative non-diagnostic patches based on clear denial, passive disappearance/death language, or explicit self-harm intent, then refreshes the student-visible notices.

The next Goal 5 slice adds pause, restart, and exit controls through `src/app/sessionControlRuntime.js`. This lets the typed session boundary influence user-visible flow control instead of remaining a hidden state model only. The login path now also updates typed consent and user-control state.

The next Goal 5 slice extracts login bootstrap behavior into `src/app/loginRuntime.js`. Login-modal display, welcome-text updates, typed identity bootstrap, and the two silent intro messages now live outside `index.html`.

The next Goal 5 slice adds typed transcript state through `src/domain/transcript.ts`, `src/services/transcriptService.ts`, and `src/app/sessionRuntime.js`. The live page can now keep non-diagnostic chat evidence in typed state instead of relying only on rendered DOM bubbles.

The next Goal 5 slice adds a typed snapshot boundary through `src/contracts/sessionSnapshotContract.ts`, `src/services/sessionSnapshotService.ts`, and `src/app/sessionRuntime.js`. This introduces export/restore structure for future controlled handoff without crossing the current rule against browser persistence of student identity or report content.

## Goal 6

Goal 6 now starts with typed service and utility modules under `src/services/` and `src/utils/`. Shared SSE parsing, text sanitation, chat transport, and session-state operations are no longer only roadmap placeholders; they now exist as code and can be verified separately from the legacy page runtime.

The next Goal 6 slice connects the legacy page runtime to those typed modules by compiling them into `public/runtime/` and having `src/app/chatRuntime.js` lazy-load the generated `chatService.js` module instead of maintaining a parallel transport implementation.

## Goal 7

Goal 7 now starts with a typed workflow gateway helper under `src/services/workflowService.ts` plus a bridge in `src/app/uploadRuntime.js`. The active page still does not call Feishu directly, but it now has a typed path for moving from local upload state transitions to a future local or agent-owned workflow gateway.

The next Goal 7 slice adds a typed report-draft path through `src/services/reportDraftService.ts` and `src/app/reportDraftRuntime.js`. Recent chat and GAD excerpts are now pulled from typed transcript state, converted into a non-diagnostic `AgentReportPayload`, and passed to the workflow bridge instead of using a fixed synthetic placeholder body or DOM scraping.

The next Goal 7 slice extends that bridge into a gateway submission package: `workflowContract.ts`, `workflowService.ts`, `uploadRuntime.js`, and `server/proxy_server.py` now support an optional typed `session_snapshot` alongside the workflow input fields. This keeps the student browser away from direct persistence or Feishu writes, while giving a controlled gateway enough structured state for future backend handoff.

The next Goal 7 slice moves the gateway one step past pure mock responses by adding a `local_audit` mode in `server/proxy_server.py`. The controlled local gateway can now persist a JSON audit record for synthetic verification and return the relative audit path to the frontend state layer, which is closer to a real backend adapter than `mock_success` alone.
