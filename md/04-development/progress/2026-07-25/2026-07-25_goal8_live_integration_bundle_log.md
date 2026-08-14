### [2026-07-25] Goal 8 Live Integration Bundle Development Log

- **任务概述**：把真实联调脚本进一步收成一个总入口，新增 `scripts/check_all_live_integrations.ps1`，用一条命令串起 live NK-GeniOS 对话验证和 live workflow forward 验证。
- **代码变更路径**：涉及 `Mental-LLM_JxFdj/scripts/check_all_live_integrations.ps1`、`Mental-LLM_JxFdj/scripts/run_local.md`、`Mental-LLM_JxFdj/tests/live_nankai_chat_check.md`、`Mental-LLM_JxFdj/README.md`、`testing/2026-07-25_goal8_live_integration_bundle_check.md`、`progress/2026-07-25_goal8_live_integration_bundle_log.md`。
- **技术亮点与潜在风险**：后续拿到真实凭据后，只需要执行一条脚本即可完成两段 live 联调。当前仍未外部实跑，因此 `ALL_LIVE_INTEGRATIONS_PASS` 还只能在具备真实环境变量时验证。
