# Mental-LLM 项目冗杂文件整理方案与自检

日期：2026-07-28  
项目路径：`D:\Desktop\Software\AIUE\Mental-LLM_JxFdj`

---

## 一、结论摘要

当前项目的主要问题不是源码过多，而是“源码、生成产物、重复静态资源、兼容包装、验证文档”混在同一层级，导致目录阅读成本偏高。

从体量上看，真正大的部分主要是：

| 目录 | 文件数 | 体积 |
| --- | --- | --- |
| `node_modules/` | 337 | 42.75 MB |
| `dist/` | 41 | 36.36 MB |
| `public/` | 41 | 34.51 MB |
| `libs/` | 11 | 2.68 MB |
| `src/` | 56 | 0.17 MB |

这说明两个事实：

1. 冗杂感的主要来源不是 `src/` 业务代码本身。  
2. 主要负担来自构建产物、静态资源副本和历史兼容文件。

---

## 二、当前冗杂来源分析

## 2.1 生成产物与源码并存

当前项目同时存在三层运行相关内容：

- `src/`：源代码
- `public/runtime/`：由 `tsconfig.runtime.json` 编译生成的浏览器运行时模块
- `dist/`：完整构建产物

其中：
- `public/runtime/` 当前约 28 个文件，约 0.06 MB
- `dist/` 当前约 41 个文件，约 36.36 MB

问题在于：
- `src/` 是源
- `public/runtime/` 是中间生成产物
- `dist/` 是最终构建产物

这三层同时出现在项目目录里，容易让阅读者误以为它们都是需要长期维护的“代码层”。

### 判断

- `src/` 应视为唯一业务源码层
- `public/runtime/` 应视为运行时编译输出层
- `dist/` 应视为发布构建层

当前的问题不是三者都不该存在，而是它们缺少明确边界和整理策略。

---

## 2.2 根目录与 `public/` 下存在重复静态资源

当前项目根目录仍保留多份静态资源，同时 `public/` 下也有一份正式使用版本。

已确认的重复情况：

- `bachelor.glb` 与 `public/models/bachelor.glb` 哈希一致
- `tubiao.png` 与 `public/images/tubiao.png` 哈希一致
- 其他几个 `.glb` 文件也属于同类重复模式

此外：

- 根目录 `manifest.json`
- `public/manifest.json`

这两个文件不是完全相同内容，但当前页面引用的是 `/manifest.json`，也就是 `public/manifest.json` 对应的版本。  
根目录 `manifest.json` 更像历史遗留或兼容保留版本。

### 判断

根目录下这批模型和图标文件，大概率属于“旧静态资源保底副本”，不是当前正式运行路径中的主入口资源。

---

## 2.3 兼容包装文件仍与正式实现共存

目前存在：

- 根目录 `proxy_server.py`
- `server/proxy_server.py`

其中根目录版本实际只是一个 wrapper：

```python
from server.proxy_server import main

if __name__ == "__main__":
    main()
```

这说明：
- 真正实现已经迁移到 `server/proxy_server.py`
- 根目录文件只是为了兼容旧启动方式

### 判断

这类文件不一定要立刻删除，但需要被明确标记为“兼容入口”，否则会让人误认为存在两个后端实现。

---

## 2.4 文档和验证材料分散

当前项目中与验证和说明相关的内容分散在多个位置：

- `docs/`
- `tests/`
- `__tests__/`
- `scripts/`
- 项目根 `README.md`

其中：
- `__tests__/` 放自动化测试
- `tests/` 放手工验证与说明文档
- `docs/` 放架构说明、静态资源说明、联调说明、presentation notes、refactor notes 等

问题不是这些内容不该存在，而是：
- “设计说明”
- “联调运行说明”
- “验证用例”
- “历史过程说明”

目前没有分层清晰地组织起来。

### 判断

文档层需要按“面向谁”“什么时候看”来重新分组。

---

## 2.5 占位型目录和 README 增加了阅读噪音

当前存在一些目录主要只有 README 或占位内容，例如：

- `src/components/README.md`
- `src/domain/README.md`
- `src/services/README.md`
- `src/utils/README.md`
- `src/styles/README.md`

这些文件本身不是错误，但如果目录里已经有真实代码，单独的 README 占位价值有限，反而会让目录看起来更碎。

### 判断

这类 README 应该保留真正有价值的架构说明；纯占位性质的可以合并到上层文档或删除。

---

## 三、整理目标

本次整理方案的目标不是“删得越多越好”，而是做到以下四点：

1. 明确源码层、生成层、发布层  
2. 清理真正重复的静态资源副本  
3. 降低根目录噪音  
4. 让文档和验证材料更容易找

---

## 四、整理方案

## 4.1 第一层：明确三层文件边界

建议把项目文件明确分成三层：

### A. 源码层

长期维护的代码和配置：

- `src/`
- `server/`
- `scripts/`
- `__tests__/`
- `package.json`
- `tsconfig*.json`
- `vite.config.ts`
- `README.md`

### B. 运行时生成层

由源码编译得到，但不是主维护对象：

- `public/runtime/`

建议策略：
- 保留其“生成产物”身份
- 不把它当作人工维护代码
- 在文档中明确写成 build output

中期建议：
- 将其继续保留在当前路径以兼容现有 `/runtime/...` 加载方式
- 但从维护规则上明确“只改 `src/`，不改 `public/runtime/`”

### C. 发布构建层

最终发布产物：

- `dist/`

建议策略：
- 继续保持 `.gitignore` 忽略
- 默认不纳入日常目录分析
- 如无特殊发布需求，平时可清空后按需重建

---

## 4.2 第二层：清理根目录重复静态资源

当前页面正式使用的是 `public/` 下资源路径，例如：

- `/models/...`
- `/images/tubiao.png`
- `/manifest.json`

因此，建议将根目录这批静态资源分阶段处理：

### 可整理对象

- 根目录 `bachelor.glb`
- 根目录 `no.glb`
- 根目录 `original.glb`
- 根目录 `shy.glb`
- 根目录 `sleep.glb`
- 根目录 `sport.glb`
- 根目录 `thumbsup.glb`
- 根目录 `tubiao.png`

### 建议方案

短期：
- 不立即物理删除
- 先统一迁入 `legacy/static_root_backup/` 或类似归档目录
- 保留一轮回归验证窗口

中期：
- 完成回归验证后，只保留 `public/models/` 和 `public/images/`

### 对 `manifest.json` 的处理

根目录 `manifest.json` 与 `public/manifest.json` 内容不同，不能直接按“完全重复文件”处理。

建议：
- 把根目录版本标记为历史版本
- 由 `public/manifest.json` 作为当前唯一运行版本
- 如果确认无旧入口依赖，再把根目录版本迁入 `legacy/`

---

## 4.3 第三层：给兼容包装文件降权

### `proxy_server.py`

当前建议不是删除，而是“降权处理”：

- 保留根目录 `proxy_server.py` 作为兼容启动入口
- 在文件头或 README 中明确标记：
  - 这是 compatibility wrapper
  - 实际实现位于 `server/proxy_server.py`

这样处理的原因是：
- 现有脚本、说明文档或使用习惯可能仍依赖 `python proxy_server.py`
- 直接删掉会增加切换成本

所以这一类文件的正确做法不是马上删除，而是明确职责。

---

## 4.4 第四层：重组文档与验证目录

建议把文档整理为三个层次：

### A. 面向“项目理解”的文档

放架构和边界类说明：

- `docs/architecture.md`
- `docs/data_boundary.md`
- `docs/agent_integration.md`

### B. 面向“调试/联调”的文档

放运行和外部验证说明：

- `docs/external_validation_runbook.md`
- `docs/nkgenios_agent_live_fix_checklist.md`
- `docs/nkgenios_model_permission_troubleshooting.md`
- `scripts/run_local.md`

### C. 面向“历史过程”的文档

放阶段性记录、presentation notes、refactor notes：

- `docs/refactor_notes.md`
- `docs/presentation_notes.md`
- `docs/static_assets.md`

建议新建：

```text
docs/
  architecture/
  operations/
  archive/
```

迁移建议：
- `architecture.md`、`data_boundary.md`、`agent_integration.md` -> `docs/architecture/`
- 联调/排障类 -> `docs/operations/`
- `refactor_notes.md`、`presentation_notes.md`、`static_assets.md` -> `docs/archive/`

这样阅读顺序会更清楚。

---

## 4.5 第五层：重组测试材料

当前测试相关内容分成：

- `__tests__/`：自动化测试
- `tests/`：手工验证与模板

建议继续保留两层，但重新命名和分组：

```text
__tests__/
  mental-prototype.test.js

tests/
  manual/
  integration/
  templates/
```

迁移建议：

- `manual_cases.md` -> `tests/manual/`
- `security_check.md`、`smoke_check.md` -> `tests/integration/`
- `workflow_forward_check.md`、`live_*`、`api_check.md` -> `tests/integration/`
- `external_validation_record_template.md` -> `tests/templates/`

好处是：
- 自动化测试和手工测试语义分清
- 手工测试内部又按用途分清

---

## 4.6 第六层：减少目录内占位 README

对于以下目录中的 README：

- `src/components/README.md`
- `src/domain/README.md`
- `src/services/README.md`
- `src/utils/README.md`
- `src/styles/README.md`

建议判断原则：

### 保留条件

- README 里有明确模块边界约束
- README 里有使用规范
- README 里有新成员进入时必须知道的信息

### 删除或合并条件

- 只是占位说明
- 只有一句泛泛描述
- 内容已经在 `docs/architecture.md` 中覆盖

建议做法：
- 优先把真实有用的边界说明合并进 `docs/architecture.md`
- 纯占位 README 删除

---

## 五、推荐执行顺序

建议按风险最低的顺序整理：

### 第一阶段：只做分类，不做删除

1. 统一标记 `public/runtime/` 为生成层
2. 统一标记 `proxy_server.py` 为兼容入口
3. 重组 `docs/` 与 `tests/` 的目录结构
4. 清理无价值的 README 占位文件

这一阶段不碰运行链路，风险最低。

### 第二阶段：归档重复静态资源

1. 把根目录重复 `.glb` 与 `tubiao.png` 迁入归档目录
2. 验证页面、模型和图标路径不受影响
3. 验证 `manifest` 实际使用版本

### 第三阶段：收紧生成产物策略

1. 明确 `public/runtime/` 只由 `npm run runtime:build` 生成
2. 文档中禁止人工修改生成层
3. 如后续允许，再考虑让生成层完全脱离版本管理

---

## 六、自检

本方案按以下标准进行自检：

### 6.1 是否区分了“真冗余”和“有用途的共存”

结论：是。

说明：
- `dist/` 属于构建产物，不是源码冗余
- `public/runtime/` 属于生成层，不应误当人工代码处理
- `proxy_server.py` 是兼容入口，不应简单视为重复实现

### 6.2 是否避免误删当前运行链路依赖

结论：是。

说明：
- 当前页面明确使用 `/models/...`、`/images/...`、`/manifest.json`
- 因此方案没有建议直接删除 `public/` 资源
- 方案对根目录静态资源采用“先归档、后验证、再清理”的保守路线

### 6.3 是否覆盖主要冗杂来源

结论：是。

已覆盖：
- 生成产物层
- 重复静态资源
- 兼容包装文件
- 分散的文档层
- 分散的测试层
- 占位 README

### 6.4 是否具有可执行顺序

结论：是。

说明：
- 已给出低风险到高风险的三阶段执行顺序
- 先整理分类，再归档重复资源，最后收紧生成产物策略

### 6.5 是否保留回滚空间

结论：是。

说明：
- 对重复静态资源采用归档而非立即删除
- 对兼容入口采用降权而非立即移除
- 对生成产物采用先标记、后治理，而非直接改运行链路

---

## 七、最终建议

如果目标是“先把项目看起来不那么乱”，建议优先做以下三件事：

1. 重组 `docs/` 和 `tests/`  
   这是认知收益最高、运行风险最低的整理动作。

2. 把根目录重复模型和图标迁入归档目录  
   这是空间和目录整洁度收益最高的动作。

3. 把 `public/runtime/` 明确标记为生成层  
   这是避免后续继续把编译输出当源码维护的关键动作。

如果目标是“进一步做结构治理”，再进入第二轮：

4. 清理占位 README  
5. 统一兼容入口说明  
6. 再决定是否让生成产物完全脱离版本管理

