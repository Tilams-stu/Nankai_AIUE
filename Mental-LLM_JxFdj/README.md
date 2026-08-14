# Mental-LLM Prototype

大学心理健康对话式无感知测评原型。学生端通过自然对话完成交流；本地代理将请求转发给 NK-GeniOS Agent，Agent 在后台触发 `report-to-feishu` 工作流。

## Current Structure

- `index.html`: 当前学生端页面入口。
- `src/`: 维护中的浏览器逻辑、领域模型、服务与样式。
- `public/`: 浏览器静态资源和由 TypeScript 生成的 `runtime/` 模块。
- `server/`: 本地代理、受控网关和测试模拟服务。
- `scripts/`、`tests/`: 本地与外部验证材料。
- `docs/`: 当前架构和运行说明。
- `archive/`: 历史资料、回滚基线和敏感测试证据；不参与运行。

## Important Boundary

- 本原型不提供医学诊断、心理咨询或紧急服务。
- 报告面向后台留档和心理健康教师复核，不在学生端完整展示。
- 浏览器不直接写入飞书；预期链路为 `browser -> local proxy -> NK-GeniOS Agent -> report-to-feishu -> Feishu`。
- 本地 `agent_internal` 只能表示请求已交由 Agent 内部路径处理，不能替代飞书写入成功的外部确认。

## Run Locally

```powershell
npm install
npm run runtime:build
python proxy_server.py
```

浏览器访问 `http://127.0.0.1:8000`。详细环境变量和运行说明见 `scripts/run_local.md`。

## Verify

```powershell
npm run typecheck
npm run test
npm run smoke
npm run validate:local
```

外部联调步骤见 `docs/operations/external_validation_runbook.md`；人工测试用例见 `tests/manual/manual_cases.md`。

## Historical Material

历史重构记录、旧页面基线、旧测试交接记录和本地审计测试证据已移入 `archive/`。归档索引见 `archive/README.md`。
