### [2026-07-25] Goal 8 Live Integration Helper Development Log

- **任务概述**：把完整计划里仍依赖外部权限的两条真实联调链路工具化，新增 live NK-GeniOS 对话检查和 live workflow forward 检查的脚本入口，避免后续再手工拼装命令。
- **代码变更路径**：涉及 `Mental-LLM_JxFdj/test_api.py`、`Mental-LLM_JxFdj/scripts/check_live_nankai_chat.ps1`、`Mental-LLM_JxFdj/scripts/check_live_workflow_forward.ps1`、`Mental-LLM_JxFdj/scripts/run_local.md`、`Mental-LLM_JxFdj/tests/live_nankai_chat_check.md`、`Mental-LLM_JxFdj/tests/workflow_forward_check.md`、`Mental-LLM_JxFdj/README.md`、`testing/2026-07-25_goal8_live_integration_helper_check.md`、`progress/2026-07-25_goal8_live_integration_helper_log.md`。
- **技术亮点与潜在风险**：现在真实外部联调也有统一的脚本入口，后续只需要补环境变量即可执行。由于本轮未提供真实凭据，live 脚本没有进行外部实跑；本地只验证了它们不会破坏现有 smoke 和 Python 编译路径。
