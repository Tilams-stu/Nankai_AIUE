### [2026-07-25] Goal 8 Model Permission Error Path Log

- **任务概述**：为当前真实联调中出现的 `model no permission` 阻塞补上离线可重复验证，新增 mock chat upstream 和 `validate:error:model-permission` 入口，确保这条上游错误链路能在本地回归中稳定复现。
- **代码变更路径**：涉及 `Mental-LLM_JxFdj/server/mock_chat_upstream.py`、`Mental-LLM_JxFdj/scripts/check_upstream_model_permission_error.ps1`、`Mental-LLM_JxFdj/package.json`、`Mental-LLM_JxFdj/server/proxy_server.py`、`Mental-LLM_JxFdj/src/contracts/chatContract.ts`、`Mental-LLM_JxFdj/src/services/chatService.ts`、`Mental-LLM_JxFdj/src/app/chatRuntime.js`、`testing/2026-07-25_goal8_model_permission_error_path_check.md`、`progress/2026-07-25_goal8_model_permission_error_path_log.md`。
- **技术亮点与潜在风险**：现在 `model no permission` 不仅有 live 证据，还有 `UPSTREAM_MODEL_PERMISSION_ERROR_PASS` 的离线回归入口。后续即使平台侧问题修好，这条错误链也能作为稳定的异常处理回归测试保留下来。
