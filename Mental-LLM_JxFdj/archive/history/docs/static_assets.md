# Static Asset Migration

Goal 3 migrates browser-facing static assets into `public/`. The earlier root-level rollback copies are now archived under `legacy/static_root_backup/`.

## Active Paths

| Asset | Active URL | Source file |
| --- | --- | --- |
| Default model | `/models/original.glb` | `public/models/original.glb` |
| Sleep model | `/models/sleep.glb` | `public/models/sleep.glb` |
| Study model | `/models/bachelor.glb` | `public/models/bachelor.glb` |
| Sport model | `/models/sport.glb` | `public/models/sport.glb` |
| Shy model | `/models/shy.glb` | `public/models/shy.glb` |
| Refusal model | `/models/no.glb` | `public/models/no.glb` |
| Thumbsup model | `/models/thumbsup.glb` | `public/models/thumbsup.glb` |
| App icon | `/images/tubiao.png` | `public/images/tubiao.png` |
| PWA manifest | `/manifest.json` | `public/manifest.json` |

## Rollback

The previous root-level `.glb`, `tubiao.png`, and `manifest.json` copies are now stored in `legacy/static_root_backup/`. The active runtime continues to load only from `public/models/`, `public/images/`, and `public/manifest.json`.

## Verification

`npm run smoke` starts the Python proxy and checks each active URL with HTTP HEAD requests. `npm run build` verifies that the current Vite configuration still accepts the prototype entry.
