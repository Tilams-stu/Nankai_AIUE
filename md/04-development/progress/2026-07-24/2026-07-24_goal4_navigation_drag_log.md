### [2026-07-24] Goal 4 Navigation Drag Development Log

- **任务概述**：继续推进 Mental-LLM 代码开发计划的 Goal 4，在导航运行时已外置的基础上，把移动端悬浮球拖拽和拖拽后抑制一次菜单切换的逻辑并回 `src/app/navigationRuntime.js`。`index.html` 不再保留 `isDragging`、`hasMoved`、触摸拖拽监听器和局部 `toggleFloatMenu` 覆盖，只保留 `bindFloatingBallDrag(...)` 初始化调用。
- **代码变更稿**：涉及 `Mental-LLM_JxFdj/index.html`、`Mental-LLM_JxFdj/src/app/navigationRuntime.js`、`Mental-LLM_JxFdj/docs/architecture.md`、`Mental-LLM_JxFdj/docs/refactor_notes.md`、`Mental-LLM_JxFdj/docs/presentation_notes.md`、`Mental-LLM_JxFdj/README.md`、`testing/2026-07-24_goal4_navigation_drag_check.md`、`progress/2026-07-24_goal4_navigation_drag_log.md`。
- **技术亮点与潜在风险**：这一步没有引入新运行时，而是把同一交互域里的拖拽能力合并回 `navigationRuntime`，减少页面脚本里的局部状态。`python -m compileall proxy_server.py server test_api.py`、`npm run typecheck`、`npm run build`、`npm run smoke` 均通过；最小 DOM 验证确认拖拽位置更新、拖拽后的一次性菜单切换抑制、移动端导航回调和外部点击关闭菜单都可工作。后续 Goal 4 仍需继续拆聊天发送/GAD-7 发送、SSE 解析和模型材质上色逻辑。
