# Agent 架构说明

## 数量结论

当前项目在 `src/agents` 目录下共有 **3 个核心 Agent 模块**：

1. `routerAgent.js`
2. `reviewCoordinator.js`
3. `consistencyAgent.js`

此外，`reviewCoordinator.js` 内部还定义了 **3 个审查子 Agent 角色**（逻辑角色，不是独立文件）：

1. 战力审查官（`power_reviewer`）
2. 资源/经济审查官（`economy_reviewer`）
3. 考据与时间线审查官（`timeline_reviewer`）

---

## 1) RouterAgent（主路由/草案生成）

文件：`src/agents/routerAgent.js`

### 主要作用

- 接收用户需求（请求文本 + 可选类别）
- 从设定文件集合中筛选“相关文件”
- 读取相关文件内容并拼接为上下文
- 调用 Claude 模型生成“设定草案”

### 输入与输出

- 输入：`request`（用户需求）、`category`（可选类别）
- 输出：一段 Markdown 格式的草案文本

### 关键机制

- `selectRelevantFiles(allFiles, request, category)`：
  - 按类别关键词匹配（如“势力/人物/功法/地理/经济/历史”）
  - 按请求文本与文件名做简单匹配
  - 若未命中则回退为“全量文件”供模型判断
- `generateDraft(...)`：
  - 聚合上下文后调用模型 `claude-sonnet-4-6`
  - 通过系统提示约束“风格一致、逻辑一致、标注冲突”

### 在流程中的位置

这是工作流的第一步：**先产出草案**，供后续审查和一致性检查使用。

---

## 2) ReviewCoordinator（多审查协调器）

文件：`src/agents/reviewCoordinator.js`

### 主要作用

- 组织多个“专业审查角色”对草案并行式逐个审查（代码中为顺序执行）
- 收集每个审查结果
- 统一汇总冲突与修改建议

### 内部审查角色

1. **战力审查官**
   - 关注战力等级、世界观底层法则、强弱平衡
   - 参考文件：`流派和等级体系.md`、`金手指.md`、`世界观.md`
2. **资源/经济审查官**
   - 关注资源分布、势力体量对应的经济规模、货币体系合理性
   - 参考文件：`货币体系.md`、`地图与势力分布.md`
3. **考据与时间线审查官**
   - 关注事件时序、历史脉络、因果一致性
   - 参考文件：`历史事件时间线.md`、`世界观.md`

### 输入与输出

- 输入：`draft`（待审查草案）
- 输出：
  - `reviews`：各审查角色反馈
  - `summary`：汇总后的总建议
  - `hasConflicts`：是否含“冲突”关键词

### 关键机制

- `runReviewer(...)`：按角色读取对应设定文件后调用模型做定向审查
- `summarizeReviews(...)`：把多个角色反馈再次交给模型统一归纳，输出优先级建议与可能的修订稿

### 在流程中的位置

这是工作流第二步：**对草案做多维质检**，降低设定冲突概率。

---

## 3) ConsistencyAgent（文档一致性检查）

文件：`src/agents/consistencyAgent.js`

### 主要作用

- 在某个文档被修改后，定位其“关联文档”
- 自动提取关键实体（角色、功法、法宝、境界、地点等）
- 检测潜在冲突并给出同步建议与优先级

### 输入与输出

- 输入：`modifiedFile`（被改文件名）、`modifiedContent`（改后内容）
- 输出：
  - `needsSync`：是否需要同步
  - `syncSuggestions`：需要更新的文档及冲突列表
  - `entities`：提取到的关键实体
  - `generateSyncReport(...)` 可生成可读报告文本

### 关键机制

- `documentRelations`：预定义文档关联图（谁改了要看谁）
- `extractEntities(...)`：用正则从文本提取角色/功法/法宝/境界/地名
- `detectConflicts(...)`：
  - 检查角色境界是否前后不一致
  - 检查功法/法宝跨文档引用是否需要同步描述
- `calculatePriority(...)`：
  - 境界冲突权重更高
  - 引用一致性问题次之

### 在流程中的位置

这是工作流第三步（可单独触发）：**变更后联动检查**，用于维护多文档长期一致性。

---

## 总体协作关系

项目主流程可概括为：

1. `RouterAgent` 生成草案
2. `ReviewCoordinator` 组织多角色审查并汇总反馈
3. `ConsistencyAgent` 对文档变更做跨文件一致性检查与同步建议

它们共同构成了“**生成 -> 审查 -> 一致性维护**”的三阶段 Agent 工作链。
