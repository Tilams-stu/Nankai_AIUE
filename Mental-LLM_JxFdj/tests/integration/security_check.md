# Security Check

Goal 2 proxy security boundaries:

- `NANKAI_API_KEY` is read only from the server process environment.
- The browser sends only business payload fields to `/api/chat`.
- The proxy uses generic user-facing errors.
- Upstream response bodies are not printed to local logs.
- The root `proxy_server.py` remains a compatibility wrapper and does not contain credential logic.

Goal 9 alignment boundaries on July 28, 2026:

- Student-facing UI must not render the full backend markdown report.
- Safety rule IDs such as `CR-001` or workflow labels such as `R2`/`RX` must stay backend-only.
- Negated self-risk text like `我没有想过伤害自己` must not be escalated as active self-risk.
- Third-party quotes like `我室友说他不想活了` must not be rewritten as the student's own risk disclosure.
- Workflow upload continues to use only `input`, `SEVERITY_LEVEL`, `Student_ID`, and `time`.
