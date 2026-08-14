# AIUE 文档中心

这里是工作区内非运行时 Markdown 和相关研究资料的统一入口。`outputs/` 保持原有结构，项目运行说明继续保留在 `Mental-LLM_JxFdj/docs/`；本目录集中管理原始研究材料、开发路线、进度和验证证据。

## 建议阅读顺序

1. [项目交接说明](00-project/项目交接说明.md)
2. [当前开发资料索引](04-development/README.md)
3. [2026-07-31 四日工作文件索引与组会进度汇报](04-development/progress/2026-07-31/2026-07-31_四日工作文件索引与组会进度汇报.md)
4. [应用运行与架构文档](../Mental-LLM_JxFdj/docs/README.md)
5. [项目说明与答辩速查](06-reference/2026-08-05_智能体识别与风险触发规则说明.md)
6. [Markdown 编写与检索规范](文档规范.md)

## 目录说明

```text
md/
  00-project/       项目交接和项目级说明
  01-research/      原始材料、专家/学生访谈和研究来源
  02-design/         设计资料
  03-meetings/       会议记录
  04-development/   路线图、进度留档和验证证据
  05-reporting/      报告资料
  06-reference/      项目说明、答辩速查和对外解释材料
  90-archive/       已废止路线图，仅供追溯
```

`outputs/` 仍是已整理的交付物目录，包括访谈分析、需求提炼、会议纪要、汇报和智能体设计，不在本次迁移范围内。

## 放置规则

- 研究来源、访谈记录和提示词基线放入 `01-research/`。
- 新开发计划放入 `04-development/roadmap/`。
- 已完成工作的简洁留档放入 `04-development/progress/YYYY-MM-DD/`。
- 测试结果、问题台账和人工验证证据放入 `04-development/validation/YYYY-MM-DD/`。
- 项目说明、答辩速查和对外解释材料放入 `06-reference/`，同一主题只保留一个当前版本。
- 被新计划明确替代的文件移入 `90-archive/`，不要删除其唯一历史信息。

第三方依赖、构建产物和可再生成临时文件不属于文档中心：`Mental-LLM_JxFdj/node_modules/`、`Mental-LLM_JxFdj/dist/` 和临时工作目录应从日常检索中排除。原根目录 `tmp/` 已迁入可恢复的 `../archive/temporary-2026-07-31/`；确认不再需要渲染缓存或生成副本后，可手动永久删除该目录。
