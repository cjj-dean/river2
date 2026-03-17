# 项目结构

```
novel-setting-editor/
├── src/                          # 源代码目录
│   ├── index.js                  # MCP Server 主入口
│   ├── agents/                   # Agent 模块
│   │   ├── routerAgent.js        # Router Agent - 主节点，生成设定草案
│   │   └── reviewCoordinator.js  # Review Coordinator - 协调多个审查 Agent
│   └── utils/                    # 工具模块
│       └── settingManager.js     # 设定文件管理器
│
├── settings/                     # 设定文件目录（你的小说设定存放在这里）
│   ├── 世界观.md                 # 示例：世界基本法则
│   ├── 流派和等级体系.md         # 示例：力量体系
│   └── 历史事件时间线.md         # 示例：历史事件
│
├── package.json                  # 项目配置
├── .env.example                  # 环境变量示例
├── .gitignore                    # Git 忽略文件
├── mcp-config.example.json       # MCP 配置示例
├── README.md                     # 项目说明
├── USAGE.md                      # 使用指南
└── start.md                      # 设计文档

```

## 核心模块说明

### src/index.js
MCP Server 的主入口文件，负责：
- 初始化 MCP Server
- 注册工具（propose_setting, review_setting, commit_setting, list_settings）
- 注册资源（设定文件）
- 处理工具调用请求

### src/agents/routerAgent.js
Router Agent（主节点），负责：
- 接收用户的设定需求
- 选择相关的设定文件
- 读取现有设定内容
- 调用 Claude API 生成设定草案

### src/agents/reviewCoordinator.js
Review Coordinator（审查协调器），负责：
- 协调三个专业审查 Agent：
  - 战力审查官：检查力量体系一致性
  - 资源/经济审查官：检查经济逻辑
  - 考据与时间线审查官：检查历史冲突
- 汇总所有审查结果
- 生成最终修改建议

### src/utils/settingManager.js
设定文件管理器，负责：
- 列出所有设定文件
- 读取单个或多个设定文件
- 解析 Markdown 文件结构
- 将新设定写入文件
- 生成设定文件摘要

## 数据流

```
用户请求
    ↓
MCP Server (index.js)
    ↓
Router Agent (routerAgent.js)
    ↓
读取相关设定文件 (settingManager.js)
    ↓
生成设定草案 (Claude API)
    ↓
Review Coordinator (reviewCoordinator.js)
    ↓
并行审查：
  - 战力审查官
  - 经济审查官
  - 时间线审查官
    ↓
汇总审查结果
    ↓
修改草案（如需要）
    ↓
写入设定文件 (settingManager.js)
    ↓
返回结果给用户
```

## 扩展点

### 1. 添加新的审查 Agent
在 `reviewCoordinator.js` 的 `this.reviewers` 数组中添加新的审查官配置。

### 2. 自定义文件选择策略
修改 `routerAgent.js` 中的 `selectRelevantFiles` 方法。

### 3. 改进 Markdown 解析
增强 `settingManager.js` 中的 `parseMarkdown` 方法。

### 4. 添加缓存机制
在 `settingManager.js` 中实现文件内容缓存。

### 5. 集成向量数据库
替换简单的关键词匹配为语义搜索。