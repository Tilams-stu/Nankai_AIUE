# Goal 5 Login Runtime Check - 2026-07-25

## Scope

This check covers the extraction of login bootstrap behavior into:

- `src/app/loginRuntime.js`

The active page now keeps only thin wrappers for:

- `checkLogin`
- `saveLoginInfo`
- `updateWelcomeMsg`

## Implementation Result

- Legacy sensitive browser storage cleanup moved out of `index.html`.
- Login-modal display moved out of `index.html`.
- Welcome-text rendering moved out of `index.html`.
- Typed identity bootstrap moved out of `index.html`.
- The two silent intro messages for chat and GAD initialization moved out of `index.html`.

## Verification Commands

Run from `D:\Desktop\Software\AIUE\Mental-LLM_JxFdj`.

```powershell
npm run runtime:build
```

Result: passed.

```powershell
npm run typecheck
```

Result: passed.

```powershell
npm run build
```

Result: passed. Existing Vite warnings remain about legacy non-module scripts, unresolved Font Awesome compatibility font URLs, and large bundle size.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

## Runtime Verification

Minimal runtime check:

- `showLogin({ modal })` clears legacy sensitive keys and shows the modal.
- `saveLoginInfo(...)` writes identity through `MentalSessionRuntime`.
- `saveLoginInfo(...)` sets consent to `accepted` and user control to `continue`.
- `saveLoginInfo(...)` triggers silent intro messages through the provided callbacks.
- `updateWelcomeText(...)` updates every matching title.

## Residual Risks

- The login runtime still delegates actual intro-message sending to the page-level chat wrappers.
- The login modal remains part of the legacy HTML layout and is not yet componentized.
