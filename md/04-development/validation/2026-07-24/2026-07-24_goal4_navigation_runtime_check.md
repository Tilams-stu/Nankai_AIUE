# Goal 4 Navigation Runtime Check - 2026-07-24

## Scope

This check covers the next Goal 4 JavaScript split for `Mental-LLM_JxFdj`: extracting navigation UI behavior from `index.html` into:

- `src/app/navigationRuntime.js`

The active page now loads that script before the remaining legacy inline script and keeps these compatibility wrappers in `index.html`:

- `switchView`
- `toggleDarkMode`
- `toggleFloatMenu`
- `handleMobileNav`

## Implementation Result

- View visibility updates moved out of `index.html`.
- Navigation button active-state updates moved out of `index.html`.
- Dark-mode body class toggling, PC icon/title updates, and mobile menu text updates moved out of `index.html`.
- Mobile floating-menu open/close behavior moved out of `index.html`.
- Mobile navigation lookup by legacy button title moved out of `index.html`.
- Outside-click menu closing moved out of `index.html`.
- Touch drag logic for the floating button intentionally remains in `index.html`.
- View lifecycle effects that still depend on local legacy state remain in the `switchView` wrapper:
  - stop/start breathing timers
  - chart initialization
  - first GAD-7 opening message

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

Result: passed. Existing Vite warnings remain about legacy non-module scripts and large bundle size. Vite also reports that `src/app/navigationRuntime.js` is a classic script and will not be bundled, which is intentional for this compatibility step.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

## Runtime Verification

Minimal DOM runtime check:

- `window.MentalNavigationRuntime` exists after evaluating `src/app/navigationRuntime.js`.
- `switchView({ name: 'profile', ... })` activates the profile view and matching navigation button.
- `toggleDarkMode()` toggles `body.dark-mode`, updates the PC mode button title to `日间模式`, and updates the mobile menu item text.
- `toggleFloatMenu()` opens the floating menu.
- `handleMobileNav({ viewName: 'meditation', ... })` closes the menu and calls the navigation callback with the matching legacy navigation button.
- `bindOutsideClose()` closes the floating menu on outside click.

Result: passed with `NAVIGATION_RUNTIME_PASS`.

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

- Most legacy JavaScript still remains in `index.html`; sound-grid, model mood switching, and navigation UI runtimes have been extracted.
- This check used static inspection, build/smoke checks, and minimal DOM runtime verification. A full desktop/mobile browser visual regression is still needed before declaring Goal 4 complete.
- The local Git status command still reports `not a git repository`, so Git diff/status could not be used as evidence.
