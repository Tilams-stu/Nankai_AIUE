# Source Layout

`src/` is the only long-term maintained source layer for frontend-side project logic.

## Structure

- `app/`: browser runtime glue and page orchestration.
  It binds DOM events, bridges the legacy page with typed modules, and owns page-level flow control.
- `domain/`: non-diagnostic state models and enums.
  This layer defines session, dialogue stage, assessment, safety, transcript, report, and upload state shapes.
- `services/`: business logic and transport logic.
  This layer updates typed state, builds reports, applies safety rules, parses streams, and submits workflow payloads.
- `contracts/`: shared cross-boundary contracts.
  This layer defines typed interfaces shared between browser runtime and backend/workflow boundaries.
- `utils/`: small pure helpers.
  This layer holds shared text, time, and stream parsing helpers with no business ownership.
- `styles/`: active stylesheet layers for the current prototype page.

## Maintenance Rule

When source and generated runtime disagree, `src/` is authoritative.

- Edit `src/`
- Rebuild generated runtime with `npm run runtime:build`
- Do not manually edit `public/runtime/`

## Current Cleanup Result

The earlier per-folder placeholder README files under `components/`, `domain/`, `services/`, `utils/`, and `styles/` were consolidated into this file to reduce directory noise. The project currently does not use a real `components/` implementation layer yet, so that folder should stay empty until real view modules are introduced.
