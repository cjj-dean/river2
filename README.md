# 小说设定集管理 MCP Server

一个基于多智能体架构的小说世界观设定管理系统，通过 MCP (Model Context Protocol) 提供设定冲突检测和知识图谱补全功能。

## 核心功能

- **设定提议**: 根据用户需求自动生成详细的设定草案
- **多维度审查**: 通过战力、经济、时间线等多个专业 Agent 检测设定冲突
- **智能整合**: 自动将审查通过的设定写入对应的 Markdown 文件
- **一致性检查**: 自动检测文档修改后需要同步的关联文档
- **MCP 集成**: 可在 Claude Code 等支持 MCP 的工具中直接使用

## 工作流程

1. **提议阶段**: Router Agent 读取现有设定，生成新设定草案
2. **审查阶段**: 多个专业审查官并行检测草案与现有设定的冲突
   - 战力审查官：检查力量体系一致性
   - 资源/经济审查官：检查经济逻辑合理性
   - 考据与时间线审查官：检查历史时间线冲突
3. **整合阶段**: 修改草案并精准写入对应文件

## 安装

```bash
npm install
```

## 配置

1. 设置环境变量：

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

2. 将你的小说设定 Markdown 文件放入 `settings/` 目录

推荐的设定文件结构：
- `世界观.md` - 世界的基本法则和设定
- `流派和等级体系.md` - 力量体系和等级划分
- `地图与势力分布.md` - 地理和势力信息
- `人物关系与势力架构.md` - 人物和组织关系
- `货币体系.md` - 经济和资源系统
- `历史事件时间线.md` - 重要历史事件
- `金手指.md` - 主角特殊能力

## 在 Claude Code 中使用

1. 在 Claude Code 的配置文件中添加此 MCP Server：

```json
{
  "mcpServers": {
    "novel-setting-editor": {
      "command": "node",
      "args": ["D:/claude/novel-setting-editor/src/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

2. 重启 Claude Code

3. 使用可用的工具：
   - `propose_setting`: 提议新设定
   - `review_setting`: 审查设定草案
   - `commit_setting`: 提交设定到文件
   - `list_settings`: 列出所有设定文件
   - `check_consistency`: 检查文档一致性（新功能）

## 使用示例

### 示例1：添加新设定

在 Claude Code 中：

```
请帮我添加一个专门猎杀主角所在流派的暗杀组织
```

系统会：
1. 自动调用 `propose_setting` 生成草案
2. 调用 `review_setting` 进行多维度审查
3. 根据审查结果修改草案
4. 调用 `commit_setting` 将设定写入相关文件

### 示例2：检查文档一致性

修改"主角成长路线图.md"后，运行一致性检查：

```bash
node test-consistency.js
```

系统会：
1. 提取文档中的角色、功法、法宝等实体
2. 检查关联文档（主要角色、功法术法、法宝图鉴等）
3. 检测境界不一致、功法描述冲突等问题
4. 生成同步建议报告

详细使用方法请参考：[一致性检查使用指南](./docs/一致性检查使用指南.md)

## 技术架构

- **Node.js + ES Modules**: 现代 JavaScript 开发
- **Anthropic Claude API**: 强大的推理和审查能力
- **MCP SDK**: 标准化的工具协议
- **Markdown**: 人类可读的设定存储格式

## 扩展性

- 可以轻松添加新的审查 Agent（如：魔法体系审查官、科技树审查官等）
- 支持自定义设定文件结构
- 可以集成向量数据库实现更智能的文件检索

## 许可证

ISC