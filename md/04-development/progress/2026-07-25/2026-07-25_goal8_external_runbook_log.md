### [2026-07-25] Goal 8 External Runbook Development Log

- **任务概述**：将真实外部联调流程固化成项目内 runbook 和留证模板，避免后续拿到凭据后仍依赖聊天记录或个人记忆执行。
- **代码变更路径**：涉及 `Mental-LLM_JxFdj/docs/external_validation_runbook.md`、`Mental-LLM_JxFdj/tests/external_validation_record_template.md`、`Mental-LLM_JxFdj/README.md`、`testing/2026-07-25_goal8_external_runbook_check.md`、`progress/2026-07-25_goal8_external_runbook_log.md`。
- **技术亮点与潜在风险**：现在真实外部联调已经有固定执行顺序、失败判读和证据模板。当前仍未实跑 live 外部环境，因此该 runbook 只能证明“可执行流程已定义”，不能替代真实权限验证本身。
