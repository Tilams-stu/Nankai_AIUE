# Direct Use App Guide

## Purpose

This guide is for the next classmates who should directly use the application as a student-facing assessment prototype, not continue engineering-only validation first.

## Current Direct-Use Boundary

The app is now ready for this direct-use flow:

1. open the local app
2. enter synthetic student identity
3. complete a natural conversation in the main chat view
4. optionally use the supplemental assessment view to add stress / anxiety / sleep details
5. click `结束并生成记录`, or finish with a clear summary/closure message
6. let the app generate a backend-only report and show only non-diagnostic student-side status
7. if the page is refreshed in the same tab, confirm whether the session restores instead of silently starting over

## Start Steps

From the project root:

```powershell
$env:NANKAI_API_KEY="replace_with_real_key"
python proxy_server.py
```

Open:

```text
http://127.0.0.1:8000/
```

## Recommended Pre-Use Verification

Before handing the app to classmates for direct use, run:

```powershell
npm run validate:local
npm run validate:live
```

Expected results:

- `ALL_LOCAL_VALIDATIONS_PASS`
- `ALL_LIVE_AUTOMATED_CHECKS_PASS`

## Student-Facing Usage Notes

1. The main chat view is the primary entry.
2. The supplemental assessment view now shares the same owned Agent as the main chat view; it is no longer treated as a separate old GAD bot path.
3. The full backend report must not be shown to the student side.
4. The student side should only show stage, safety wording, and record status in non-diagnostic language.

## Operator Notes

1. Use synthetic student IDs and names unless real approvals are already complete.
2. If the app says the record channel is unavailable, check the workflow configuration rather than asking the student to retry blindly.
3. If the app reaches a completion state, manually confirm whether the Agent internally triggered `report-to-feishu` and whether Feishu row visibility is correct.
4. On localhost, use the developer debug area only to inspect workflow mode, payload hash suffix, session ID, and local conversation policy state.

## Still Manual After Direct Use

The following are still outside automatic proof:

1. Agent-internal `report-to-feishu` execution
2. Feishu row creation
3. Feishu viewer visibility
4. real data permission and retention approval
