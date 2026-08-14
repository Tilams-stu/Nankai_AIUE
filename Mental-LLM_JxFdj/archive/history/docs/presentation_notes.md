# Presentation Notes

Goal 1 can be described as engineering preparation rather than feature expansion.

The project now has a clear future structure: view code, service calls, domain state, and workflow contracts are separated into planned folders. The existing prototype still runs from `index.html`, so this step lowers refactor risk while making later code work explainable in a group meeting.

External confirmations still needed:

- Previously exposed keys must be rotated outside the codebase.
- Real student data requires consent, permission, retention, and desensitization rules.
- Feishu final visibility depends on workflow and table permissions.

Goal 2 adds a repeatable startup path: the root command remains available, while the real proxy code now lives under `server/`. This makes the backend boundary easier to explain without changing the visible prototype.

Goal 3 moves the visible images, models, and manifest into `public/` and standardizes the runtime URLs. The old root files stay in place for rollback, but the active page now points at the public asset paths, which is easier to explain than a mixed root/public setup.

Goal 4 begins the frontend split in a conservative way: the page CSS is now outside `index.html` and layered as `base.css`, `layout.css`, and `components.css` behind the existing `legacy-page.css` entry. The HTML structure and JavaScript behavior remain unchanged, so this is a visible engineering cleanup with limited runtime risk.

Goal 4 then takes the first narrow JavaScript split: the white-noise sound grid runtime now lives in `src/app/soundGridRuntime.js`. The page still exposes the same legacy function names, which keeps the visible prototype stable while making one interactive feature easier to maintain.

Goal 4 continues with a second narrow split: model mood switching and model material recoloring now live in `src/app/modelRuntime.js`. The page still reacts to the same status buttons and chat keywords, but the asset map, mood matching logic, and `model-viewer` post-load handling are no longer trapped in `index.html`.

Goal 4 then separates core navigation UI into `src/app/navigationRuntime.js`. This moves page tab switching, active navigation state, dark-mode button text, mobile floating-menu behavior, and floating-ball drag handling out of the main HTML while preserving the old click handlers for the prototype demo.

Goal 4 also separates the meditation breathing loop into `src/app/meditationRuntime.js`. The visible relaxation page behaves the same, but timer state is no longer stored inside the main HTML script.

Goal 4 then moves the profile-page charts into `src/app/profileChartRuntime.js`. The demo still opens the same status charts, but chart configuration and refresh state are now isolated from the main HTML.

Goal 4 also moves form helpers into `src/app/formRuntime.js`. The demo still submits on Enter and keeps the same settings modal, but textarea sizing and modal behavior are no longer buried in the main HTML script.

Goal 4 also moves chat bubble rendering into `src/app/messageRuntime.js`. The visible conversation still streams into the same bubbles, but DOM insertion and auto-scroll are no longer tied directly to the main HTML script.

Goal 4 also moves browser speech recognition into `src/app/speechRuntime.js`. The demo still uses the same microphone buttons, but speech setup, active-input transcript injection, and listening-state UI are no longer buried in the main HTML script.

Goal 4 also moves the shared chat transport into `src/app/chatRuntime.js`. The demo still sends messages to the same local proxy, but request assembly, stream buffering, and common error handling are no longer duplicated in the main HTML script.

Goal 5 now begins with explicit domain code instead of notes only. Session state, safety state, upload state, and the data boundary are now typed and documented, which raises the floor for later report, workflow, and privacy work.

Goal 5 now also touches the live page: a small session bridge runtime keeps the old page config in sync with typed session state, so session modeling is no longer only structural code sitting off to the side.

Goal 5 now also exposes typed domain state to the student-facing UI in a limited form: the page shows non-diagnostic safety and record status text without exposing internal risk labels or full report content.

Goal 5 now also lets explicit conversation content change the typed safety state. The page still does not diagnose, but it can move from “未询问” to more cautious non-diagnostic status text when the user says something clearly concerning.

The student-facing chat panels now also reveal a compact support notice when the typed safety state crosses that threshold. This keeps the prototype aligned with the requirement to prefer real-world support prompts over hidden internal-only state.

Goal 5 now also includes basic session controls: the student can pause the text inputs, restart the current session flow, or exit back to the login boundary, and those actions now reset or update both the visible UI and the typed session boundary together.

Goal 5 now also moves the login bootstrap into its own runtime. The student still sees the same welcome modal and warm start flow, but the identity bootstrap path is no longer mixed into the main page script.

Goal 5 now also stores typed transcript state. This matters in a presentation because the project no longer depends only on whatever happens to be visible in the DOM; conversation evidence now has an explicit state boundary that later report, privacy, and export work can reuse.

Goal 5 now also has a typed session snapshot boundary. This is useful in a presentation because it shows the project can prepare for later controlled export, backend handoff, or supervised restore flows without immediately persisting sensitive student state in the browser.

Goal 6 now begins with typed service code instead of future placeholders. Shared SSE parsing, chat transport, and session-state updates now live in `src/services/` and `src/utils/`, which makes the later service-layer migration easier to explain and test.

The current page now also consumes part of that typed service layer through generated browser modules in `public/runtime/`. This means the refactor is no longer only structural; one live workflow is already using the extracted service code.

Goal 7 now begins in a minimal but real way: there is a typed workflow gateway service and a matching upload-state bridge. The page still does not talk to Feishu directly, but the state machine for “处理中 / 已提交待确认 / 失败待排查” is no longer just a placeholder.

Goal 7 now also has a typed report-draft builder. The current page can read a small window of recent chat and GAD excerpts from typed transcript state, combine that with typed session and safety state, and prepare one backend-only payload shape before the workflow call. This is useful in a presentation because it shows that the refactor is already separating student-visible conversation, internal record assembly, and external archival flow.

Goal 7 now also carries an optional typed session snapshot into the local workflow-gateway boundary. That matters in a presentation because it shows the project is no longer sending only a flat markdown string; it now has a structured handoff path for future backend review, replay, or audit logic without breaking the privacy rule against direct browser persistence.

Goal 7 now also has a controlled local audit mode in the gateway. This is useful in a presentation because it shows one step beyond a fake success response: the local adapter can now actually write a structured audit record and return its path, which makes the backend handoff story more concrete.

Goal 8 turns the accumulated engineering work into a handoff-ready prototype. The manual cases now cover first-open boundaries, credential handling, identity storage, ordinary conversation, missing information, safety signals, report hiding, workflow field mapping, disabled gateway behavior, and the local audit gateway.

The Goal 8 audit found and closed two boundary gaps from the previous slices: report-like markdown from an Agent response is now replaced in the student-facing chat by a short completion notice, and the default backend report draft no longer writes student name into the markdown payload.

The local validation package should be described carefully: `typecheck`, `smoke`, and the local audit-gateway check prove the current offline code path, static assets, generated runtime modules, proxy error handling, workflow contract shape, and controlled audit adapter. They do not prove live NK-GeniOS authorization, published workflow success, or Feishu table visibility, because those require external permissions.

Suggested demo sequence:

1. Show the page loading through the local proxy and entering with synthetic identity.
2. Send an ordinary stress message and point out that the student sees conversation, not a professional report.
3. Send an ambiguous safety sentence and show the support notice without internal risk labels.
4. Run `npm run smoke` and the local audit-gateway script.
5. Open the localhost-only debug area only as a developer verification surface, not as a student-facing feature.

Current completion language:

The codebase is now in a local prototype handoff state for goals 0-8. It is not a clinical deployment, not connected to real student data by default, and still needs authorized external checks before claiming NK-GeniOS plus Feishu production closure.
