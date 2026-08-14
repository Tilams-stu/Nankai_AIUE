# Goal 2 Proxy Check - 2026-07-24

## Scope

Goal 2 completed the local proxy consolidation for `Mental-LLM_JxFdj`.

This check covers:

- Moving the runnable proxy implementation to `Mental-LLM_JxFdj/server/proxy_server.py`.
- Keeping `Mental-LLM_JxFdj/proxy_server.py` as a compatibility entry.
- Serving the existing static prototype from the project root.
- Keeping the upstream NK-GeniOS API key on the server side through `NANKAI_API_KEY`.
- Avoiding new frontend credential exposure.

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
npm run smoke
```

Result: passed with `SMOKE_CHECK_PASS`.

The smoke script starts `python -m server.proxy_server` on port `8765`, confirms `/` returns HTTP 200, and confirms `/api/chat` fails with a controlled 500 response when `NANKAI_API_KEY` is absent.

## Security Scan

Targeted scan:

```powershell
rg -n "Authorization|targetKey|requests\.|import requests|localStorage\.setItem\('school_(key_v2|gad_key|student_id|student_name)'" index.html proxy_server.py server test_api.py src docs tests scripts README.md .env.example server\config.example.env
```

Result:

- No active frontend API-key storage or `Authorization` header was found.
- No `requests` dependency/import remains in the proxy check path.
- The only match was documentation text in `tests/api_check.md`, describing that browser requests should not include upstream authorization headers.

## Cleanup

`python -m compileall` generated Python cache folders during verification. The generated `__pycache__` folders under the project root and `server/` were removed after the check.

Final generated-artifact check:

- No project-root `dist/`.
- No project-root `.npm-cache/`.
- No remaining project-root or `server/` `__pycache__/`.

## Residual Risks

- The previously exposed upstream key still needs external rotation on the NK-GeniOS side.
- Real student-data use still depends on consent, permission, retention, and desensitization rules being confirmed by the group.
- The proxy currently keeps conversation IDs in process memory only; this is acceptable for the minimal local prototype but not enough for production persistence.
