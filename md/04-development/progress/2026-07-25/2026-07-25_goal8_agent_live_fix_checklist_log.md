### [2026-07-25] Goal 8 Agent Live Fix Checklist Log

- **任务概述**：将当前真实联调阻塞点转成可直接执行的平台侧清单，明确 `Mental LLM` Agent 需要检查的模型权限与重新发布步骤，方便在 NK-GeniOS 平台内完成修复后回到本地继续 live 测试。
- **代码变更路径**：涉及 `Mental-LLM_JxFdj/docs/nkgenios_agent_live_fix_checklist.md`、`progress/2026-07-25_goal8_agent_live_fix_checklist_log.md`。
- **技术亮点与潜在风险**：当前阻塞点已经被收敛到一个具体的 Agent、一个具体的模型 id 和一组明确的平台操作步骤。真正修复仍需在 NK-GeniOS 页面中完成，随后再回到本地重跑 `npm run validate:live:chat`。
