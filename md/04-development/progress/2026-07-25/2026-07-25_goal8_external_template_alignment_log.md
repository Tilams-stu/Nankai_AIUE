### [2026-07-25] Goal 8 External Template Alignment Log

- **任务概述**：将外部验证模板和说明文档统一到最新事实：当前主路径是 Agent 内部直接调用 `report-to-feishu`，workflow gateway 只在选择 `forward` 备选架构时才需要。
- **代码变更路径**：涉及 `Mental-LLM_JxFdj/tests/external_validation_record_template.md`、`testing/2026-07-25_goal8_live_integration_helper_check.md`、`testing/2026-07-25_goal8_live_preflight_check.md`、`testing/2026-07-25_goal8_live_integration_bundle_check.md`、`progress/2026-07-25_goal8_external_template_alignment_log.md`。
- **技术亮点与潜在风险**：这样后续无论是谁做 live 留证，都不会再把 gateway 当成默认必填项。当前真实阻塞点仍然是 `Mental LLM` Agent 内部模型权限，尚未进入 workflow/Feishu 成功验证阶段。
