### [2026-07-24] Goal 4 Model Material Runtime Development Log

- **任务概述**：继续推进 Mental-LLM 代码开发计划的 Goal 4，在模型心情切换已经外置的基础上，把 `model-viewer` 的材质上色和 `load` 后处理并回 `src/app/modelRuntime.js`。`index.html` 不再保留 `applyColors()` 和双 `load` 监听器，只保留一次 `MentalModelRuntime.bindViewerMaterialHandlers()` 初始化调用。
- **代码变更稿**：涉及 `Mental-LLM_JxFdj/index.html`、`Mental-LLM_JxFdj/src/app/modelRuntime.js`、`Mental-LLM_JxFdj/README.md`、`Mental-LLM_JxFdj/docs/architecture.md`、`Mental-LLM_JxFdj/docs/refactor_notes.md`、`Mental-LLM_JxFdj/docs/presentation_notes.md`、`Mental-LLM_JxFdj/tests/smoke_check.md`、`testing/2026-07-24_goal4_model_material_runtime_check.md`、`progress/2026-07-24_goal4_model_material_runtime_log.md`。
- **技术亮点与潜在风险**：这一步没有新增新的运行时文件，而是把同一能力域内的 `model-viewer` 后处理并回现有 `modelRuntime`，减少页面脚本里的重复监听器和材质分支。`npm run build`、`npm run smoke` 通过；最小 DOM 验证确认材质颜色分支、眼睛 roughness 设置、viewer 绑定去重和 `load` 后处理都能工作。后续 Goal 4 仍需继续拆聊天发送、GAD-7 发送、SSE 解析，以及必要时更系统地整理 `model-viewer` 相关状态。
