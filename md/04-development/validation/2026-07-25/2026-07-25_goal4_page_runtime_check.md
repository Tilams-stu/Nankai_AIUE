# Goal 4 Page Runtime Check - 2026-07-25

## Scope

This check covers the final Goal 4 page-entry extraction in `Mental-LLM_JxFdj`:

- `src/app/pageRuntime.js`
- `index.html`
- `scripts/smoke_check.ps1`
- `tests/smoke_check.md`

## Implementation Result

- The remaining inline page script from `index.html` was moved into `src/app/pageRuntime.js`.
- Legacy HTML event handlers remain compatible through globals exposed by `pageRuntime.js`, including:
  - `sendMessage`
  - `sendGadMessage`
  - `switchView`
  - `toggleVoice`
  - `saveLoginInfo`
  - `toggleSessionPause`
  - `restartSession`
  - `exitSession`
  - `toggleDarkMode`
  - `toggleFloatMenu`
- `pageRuntime.js` now owns:
  - page-level `CFG` and `UI` setup
  - login/session bootstrap
  - GAD opening message injection
  - view-switch side effects
  - chat/GAD runtime wiring
  - modal, floating-nav, speech, debug-panel, and model-entry initialization

## Verification Commands

Run from `D:\Desktop\Software\AIUE\Mental-LLM_JxFdj`.

```powershell
(Get-Content -Encoding UTF8 'index.html').Count
```

Result: `354`

```powershell
npm run typecheck
```

Result: passed.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

## Acceptance Outcome

- Original Goal 4 hard gate `index.html < 400` is now satisfied.
- The page still runs through the same local entry.
- The smoke check now explicitly covers `/src/app/pageRuntime.js`.

## Residual Risks

- The page still uses legacy inline HTML event attributes such as `onclick`; they now route into `pageRuntime.js`, but full declarative event binding has not been attempted.
- Some user-facing Chinese strings in the legacy HTML remain mojibake from pre-existing source text and were preserved in this extraction step.
