### [2026-07-25] Goal 5 Login Runtime Development Log

- **任务概述**：继续推进 Mental-LLM 代码开发计划，把登录初始化从 `index.html` 主脚本中剥离到 `src/app/loginRuntime.js`。当前页面仍保留 `checkLogin`、`saveLoginInfo`、`updateWelcomeMsg` 入口，但实际的登录弹窗显示、typed identity 写回、欢迎语更新和静默初始化消息都由独立运行时处理。
- **代码变更稿**：涉及 `Mental-LLM_JxFdj/src/app/loginRuntime.js`、`Mental-LLM_JxFdj/index.html`、`Mental-LLM_JxFdj/scripts/smoke_check.ps1`、`Mental-LLM_JxFdj/tests/smoke_check.md`、`Mental-LLM_JxFdj/README.md`、`Mental-LLM_JxFdj/docs/architecture.md`、`Mental-LLM_JxFdj/docs/refactor_notes.md`、`Mental-LLM_JxFdj/docs/presentation_notes.md`、`testing/2026-07-25_goal5_login_runtime_check.md`。
- **技术亮点与潜在风险**：这一轮继续压缩 `index.html`，同时让 typed session bridge 参与登录流程，而不是只参与视图切换和控制动作。后续仍需把登录 modal 的展示层进一步从 legacy HTML 抽离成更独立的 UI 结构。
