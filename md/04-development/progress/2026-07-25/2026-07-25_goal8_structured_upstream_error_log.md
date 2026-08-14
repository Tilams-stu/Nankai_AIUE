### [2026-07-25] Goal 8 Structured Upstream Error Development Log

- **任务概述**：将真实联调中暴露出的 `model no permission` 上游错误接入程序主链路，让代理和前端都能识别并展示结构化错误，而不是只显示模糊的“服务暂不可用”或“网络异常”。
- **代码变更路径**：涉及 `Mental-LLM_JxFdj/server/proxy_server.py`、`Mental-LLM_JxFdj/src/contracts/chatContract.ts`、`Mental-LLM_JxFdj/src/services/chatService.ts`、`Mental-LLM_JxFdj/src/app/chatRuntime.js`、`testing/2026-07-25_goal8_structured_upstream_error_check.md`、`progress/2026-07-25_goal8_structured_upstream_error_log.md`。
- **技术亮点与潜在风险**：当前真实阻塞点已经不仅能在独立 live 脚本里看到，还能通过本地代理和前端错误链路被识别为 `upstream_model_no_permission`。`ALL_LOCAL_VALIDATIONS_PASS` 与 Python 编译检查继续通过。后续如果出现其他高频上游错误，还需要继续扩展分类映射。
