### [2026-07-25] Goal 8 NPM Validation Entry Development Log

- **任务概述**：为本地验证和 live 验证补充 `package.json` 的 npm 入口，减少交接时对 PowerShell 脚本名的记忆负担，并实跑 `npm run validate:local` 证明其可用。
- **代码变更路径**：涉及 `Mental-LLM_JxFdj/package.json`、`Mental-LLM_JxFdj/README.md`、`Mental-LLM_JxFdj/scripts/run_local.md`、`testing/2026-07-25_goal8_npm_validation_entry_check.md`、`progress/2026-07-25_goal8_npm_validation_entry_log.md`。
- **技术亮点与潜在风险**：现在离线全量验证既能走 `check_all_local_validations.ps1`，也能走 `npm run validate:local`。live 入口同样映射到了 npm script，但仍然依赖真实外部凭据和权限。
