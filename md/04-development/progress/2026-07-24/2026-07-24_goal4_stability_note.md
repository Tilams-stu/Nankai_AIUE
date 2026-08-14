### [2026-07-24] Goal 4 Stability Note

- **Final stable result**: CSS is externalized to `Mental-LLM_JxFdj/src/styles/legacy-page.css`; the original page script remains inline in `Mental-LLM_JxFdj/index.html`.
- **Final size**: `index.html` is 1173 lines; `legacy-page.css` is 455 lines.
- **Runtime verification**: a temporary attempt to externalize the legacy page script was reverted after browser validation showed runtime risk. The final browser check used synthetic local-only login data and confirmed the start action updates the heading to `Hi, 小明`.
- **Generated artifacts**: `dist/` and Python `__pycache__/` folders remain local generated artifacts from verification commands. They should be removed before packaging or final handoff when deletion policy allows it.
