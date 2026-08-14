# API Check

Goal 2 checks the local proxy contract only. It does not require a real NK-GeniOS key.

Expected local behavior:

- `GET /` returns the current `index.html` from the project root.
- `POST /api/chat` without `NANKAI_API_KEY` returns JSON with status `500`.
- Browser requests to `/api/chat` do not include upstream `Authorization` or API-key headers.
- Proxy logs include request id, status category, and elapsed time, but not API keys, student names, student IDs, or full message text.
- `GET /api/workflow/status` returns the configured workflow mode and, in `forward` mode, the configured `target_origin`.
- `POST /api/workflow/report-to-feishu` supports `disabled`, `mock_success`, `mock_failure`, `local_audit`, and `forward`.
