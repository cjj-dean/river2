# 快速入门

## 5 分钟上手指南

### 步骤 1: 安装依赖 (1 分钟)

```bash
npm install
```

### 步骤 2: 配置 API Key (1 分钟)

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入你的 Anthropic API Key：
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

获取 API Key: https://console.anthropic.com/

### 步骤 3: 准备设定文件 (2 分钟)

将你的小说设定 Markdown 文件放入 `settings/` 目录。

已提供三个示例文件供参考：
- `世界观.md` - 世界基本法则
- `流派和等级体系.md` - 力量体系
- `历史事件时间线.md` - 历史事件

### 步骤 4: 测试系统 (1 分钟)

运行测试脚本验证配置：

```bash
npm test
```

你应该看到类似输出：
```
测试 1: 设定文件管理器
✓ 找到 3 个设定文件:
  - 世界观.md
  - 流派和等级体系.md
  - 历史事件时间线.md

测试 2: 读取设定文件
✓ 成功读取 世界观.md (XXX 字符)

测试 3: 解析 Markdown 结构
✓ 解析出 X 个章节

测试 4: 环境变量
✓ ANTHROPIC_API_KEY: sk-ant-...xxxx
```

### 步骤 5: 在 Claude Code 中使用

1. 找到 Claude Code 配置文件（通常在 `~/.config/claude-code/config.json`）

2. 添加 MCP Server 配置：

```json
{
  "mcpServers": {
    "novel-setting-editor": {
      "command": "node",
      "args": ["D:/claude/novel-setting-editor/src/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-your-key-here"
      }
    }
  }
}
```

**重要**: 将路径替换为你的实际项目路径！

3. 重启 Claude Code

4. 开始使用！在 Claude Code 中输入：

```
我想添加一个新的暗杀组织到设定中
```

## 第一次使用示例

### 示例 1: 添加新势力

**输入**:
```
我想在设定里增加一个专门猎杀主角所在流派的暗杀组织。
组织名称：影刃门
特点：擅长隐身和暗杀
```

**系统会做什么**:
1. 读取相关设定（世界观、流派体系等）
2. 生成详细的组织设定草案
3. 三个审查官并行审查：
   - 战力审查官：检查暗杀能力是否符合世界观法则
   - 经济审查官：检查组织资源来源是否合理
   - 时间线审查官：检查组织历史是否冲突
4. 汇总反馈，修改草案
5. 将最终设定写入相关文件

### 示例 2: 添加新功法

**输入**:
```
添加一个隐身功法，要求能够欺骗神识
```

**系统会**:
- 根据世界观中"神识可以锁定空间"的设定
- 生成合理的功法描述（如"视觉与神识双重欺骗"而非"绝对隐身"）
- 确保不违反底层法则

## 常见问题

### Q: 测试失败怎么办？

**A**: 检查：
1. Node.js 版本是否 >= 18
2. `.env` 文件是否存在且包含有效的 API Key
3. `settings/` 目录是否存在

### Q: Claude Code 找不到 MCP Server？

**A**: 确保：
1. 配置文件路径正确
2. 项目路径使用绝对路径
3. 已重启 Claude Code

### Q: API 调用失败？

**A**: 检查：
1. API Key 是否有效
2. 网络连接是否正常
3. API 配额是否充足

## 下一步

- 阅读 [USAGE.md](./USAGE.md) 了解详细使用方法
- 阅读 [STRUCTURE.md](./STRUCTURE.md) 了解项目架构
- 查看 [README.md](./README.md) 了解完整功能

## 需要帮助？

- 查看示例设定文件了解格式
- 阅读代码注释了解实现细节
- 提交 Issue 报告问题

祝你使用愉快！🎉