### [2026-07-25] Goal 4 Page Runtime Development Log

- **任务概述**：继续推进 `Mental-LLM_JxFdj` 的 Goal 4，把 `index.html` 里最后一整块页面级初始化和兼容全局函数迁移到独立的 `src/app/pageRuntime.js`。这一轮解决了此前审计里遗留的 `index.html` 体量问题，并保留现有 `onclick`/`onkeydown` 入口不变。
- **代码变更路径**：涉及 `Mental-LLM_JxFdj/src/app/pageRuntime.js`、`Mental-LLM_JxFdj/index.html`、`Mental-LLM_JxFdj/scripts/smoke_check.ps1`、`Mental-LLM_JxFdj/tests/smoke_check.md`、`Mental-LLM_JxFdj/docs/architecture.md`、`Mental-LLM_JxFdj/README.md`、`testing/2026-07-25_goal4_page_runtime_check.md`、`progress/2026-07-25_goal4_page_runtime_log.md`。
- **技术亮点与潜在风险**：页面级 `CFG/UI`、登录引导、会话重置、GAD 首次提示、浮动导航、聊天绑定和 debug panel 初始化现在都集中在 `pageRuntime.js`，`index.html` 从 798 行降到 354 行。`npm run typecheck` 和 `npm run smoke` 继续通过。当前仍保留 HTML 内联事件属性，且旧源码里部分中文文案存在既有乱码，本轮未顺手重写。
