### [2026-07-24] Goal 5 Safety Support Notice Development Log

- **任务概述**：继续推进 Mental-LLM 代码开发计划的 Goal 5，在 typed safety / upload 状态已经进入页面状态标签之后，把一条真正可见的学生端支持提示接到聊天界面。当 safety summary 到达 `needs_follow_up` 或 `suggest_real_world_support` 时，聊天页和 GAD 页显示一段非诊断、非编造资源的现实支持提示。
- **代码变更稿**：涉及 `Mental-LLM_JxFdj/src/domain/safetyStatus.ts`、`Mental-LLM_JxFdj/src/app/statusNoticeRuntime.js`、`Mental-LLM_JxFdj/src/app/safetyRuntime.js`、`Mental-LLM_JxFdj/src/styles/components.css`、`Mental-LLM_JxFdj/index.html`、`Mental-LLM_JxFdj/docs/architecture.md`、`Mental-LLM_JxFdj/docs/presentation_notes.md`、`testing/2026-07-24_goal5_safety_support_notice_check.md`。
- **技术亮点与潜在风险**：这一步让 Goal 5 的安全状态不再只反映为 header 标签，而是开始影响学生端正文区域。提示文本保持非诊断和通用，不捏造学校电话或外部热线；它只是把“尽快联系可信任的人、学校心理健康中心或当地紧急服务”的建议显式放出来。`runtime:build`、`typecheck`、`build`、`smoke` 和 `STATUS_SUPPORT_NOTICE_PASS` 均通过。后续还需要把更完整的危机澄清流程和正式资源白名单接到这条路径上。
