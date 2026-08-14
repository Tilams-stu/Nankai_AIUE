# Goal 3 Static Assets Check - 2026-07-24

## Scope

Goal 3 migrated browser-facing static assets for `Mental-LLM_JxFdj` into `public/` while keeping root-level original files as rollback baseline.

Migrated assets:

- `public/models/original.glb`
- `public/models/sleep.glb`
- `public/models/bachelor.glb`
- `public/models/sport.glb`
- `public/models/shy.glb`
- `public/models/no.glb`
- `public/models/thumbsup.glb`
- `public/images/tubiao.png`
- `public/manifest.json`

## Runtime Paths

The active page now references:

- `/models/original.glb`
- `/models/sleep.glb`
- `/models/bachelor.glb`
- `/models/sport.glb`
- `/models/shy.glb`
- `/models/no.glb`
- `/models/thumbsup.glb`
- `/images/tubiao.png`
- `/manifest.json`

`server/proxy_server.py` maps these root public URLs to `public/` while continuing to serve `index.html` and legacy rollback files from the project root.

## Verification Commands

Run from `D:\Desktop\Software\AIUE\Mental-LLM_JxFdj`.

```powershell
python -m json.tool public\manifest.json
```

Result: passed.

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

Result: passed. Existing Vite warnings remain about non-module legacy scripts, unresolved Font Awesome compatibility fonts, and large bundle size. These are pre-existing legacy-page warnings and are not introduced by static asset migration.

```powershell
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

The smoke script now checks:

- `/` returns HTTP 200.
- `/manifest.json` returns HTTP 200.
- `/images/tubiao.png` returns HTTP 200.
- Every model under `/models/` returns HTTP 200.
- `/api/chat` returns the controlled missing-key error when `NANKAI_API_KEY` is absent.

## Static Reference Scan

```powershell
rg -n '\./(original|sleep|bachelor|sport|shy|no|thumbsup)\.glb|href="(tubiao\.png|manifest\.json)"|src="(tubiao\.png|manifest\.json)"' index.html
```

Result: no matches. The active page no longer points at old root asset paths.

## Security Scan

The targeted security scan still reports no active frontend credential path. Matches were documentation text only:

- `tests/api_check.md`: states that browser requests should not include upstream authorization headers.
- `docs/static_assets.md`: mentions the `npm run build` command.

## Cleanup

The generated `dist/` folder from `npm run build` and Python `__pycache__/` folders from `compileall` are generated artifacts, not source deliverables for this goal.

Cleanup was attempted after verification, but the command execution policy rejected recursive removal commands in this continuation. Current generated paths still present:

- `Mental-LLM_JxFdj/dist/`
- `Mental-LLM_JxFdj/__pycache__/`
- `Mental-LLM_JxFdj/server/__pycache__/`

These paths are covered by `.gitignore` where applicable and should be removed before packaging or final handoff.

## Residual Risks

- Root-level legacy assets are intentionally retained. They should not be deleted until a later cleanup goal has visual regression evidence and a rollback decision.
- The visible 3D rendering still needs browser-level visual inspection in a later page-regression phase; this goal verifies file paths and HTTP availability.
