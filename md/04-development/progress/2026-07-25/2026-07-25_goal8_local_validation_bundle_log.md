### [2026-07-25] Goal 8 Local Validation Bundle Development Log

- **任务概述**：将分散的本地验证命令收束成单一入口，`scripts/check_all_local_validations.ps1` 现在把 typecheck、smoke、local_audit、forward_offline 和 model-permission error path 五段验证串成一条命令。
- **代码变更路径**：涉及 `Mental-LLM_JxFdj/scripts/check_all_local_validations.ps1`、`Mental-LLM_JxFdj/README.md`、`Mental-LLM_JxFdj/scripts/run_local.md`、`Mental-LLM_JxFdj/tests/local_validation_bundle_check.md`、`testing/2026-07-25_goal8_local_validation_bundle_check.md`、`progress/2026-07-25_goal8_local_validation_bundle_log.md`。
- **技术亮点与潜在风险**：现在完整的本地交付验证可以一条命令跑完，且把当前最关键的真实阻塞点 `upstream_model_no_permission` 也纳入离线回归。该 bundle 仍然只覆盖离线路径，不替代真实 NK-GeniOS / workflow / Feishu 的外部验证。
