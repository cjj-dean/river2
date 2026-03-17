# 常见问题 (FAQ)

## 安装和配置

### Q: 需要什么版本的 Node.js？
**A**: Node.js 18 或更高版本。检查版本：
```bash
node --version
```

### Q: 如何获取 Anthropic API Key？
**A**:
1. 访问 https://console.anthropic.com/
2. 注册/登录账号
3. 在 API Keys 页面创建新的 API Key
4. 复制 Key（格式：`sk-ant-...`）

### Q: API Key 应该放在哪里？
**A**:
1. 复制 `.env.example` 为 `.env`
2. 在 `.env` 文件中填入：
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

### Q: 如何知道系统是否配置正确？
**A**: 运行测试脚本：
```bash
npm test
```
如果所有测试都显示 ✓，说明配置正确。

## 使用问题

### Q: 如何在 Claude Code 中使用？
**A**:
1. 找到 Claude Code 配置文件（通常在 `~/.config/claude-code/config.json`）
2. 添加 MCP Server 配置（参考 `mcp-config.example.json`）
3. 重启 Claude Code
4. 在对话中直接提出设定需求

### Q: 支持哪些类型的设定？
**A**: 支持任何类型的小说设定，包括但不限于：
- 势力/组织
- 人物/角色
- 功法/技能
- 地理/地图
- 历史事件
- 经济体系
- 魔法/科技体系

### Q: 设定文件必须用特定格式吗？
**A**:
- 使用 Markdown 格式（`.md` 文件）
- 建议使用清晰的标题层级（`#`, `##`, `###`）
- 内容越详细，AI 生成的设定越准确
- 参考 `settings/` 目录中的示例文件

### Q: 可以修改 AI 生成的设定吗？
**A**: 当然可以！
- 设定文件是纯文本 Markdown
- 可以随时手动编辑
- 建议使用 Git 进行版本控制

### Q: 如何回滚错误的设定？
**A**:
1. 如果使用 Git：`git checkout -- settings/文件名.md`
2. 如果有备份：恢复备份文件
3. 手动编辑文件删除错误内容

## 功能问题

### Q: 审查 Agent 会检查什么？
**A**: 三个专业审查官：
- **战力审查官**：力量等级、能力合理性、战力对比
- **经济审查官**：资源分布、经济规模、货币体系
- **时间线审查官**：时间点冲突、历史渊源、因果关系

### Q: 如果审查发现冲突怎么办？
**A**: 系统会：
1. 列出所有冲突点
2. 给出修改建议
3. 生成修改后的草案
4. 你可以选择接受或继续修改

### Q: 可以添加自定义的审查 Agent 吗？
**A**: 可以！在 `src/agents/reviewCoordinator.js` 中添加新的审查官配置。参考现有的审查官结构。

### Q: 系统会自动修改我的设定文件吗？
**A**:
- 只有在你明确要求 `commit_setting` 时才会写入文件
- 在 Claude Code 中，你可以审查生成的内容后再决定是否提交
- 建议使用 Git 版本控制以便随时回滚

## 性能问题

### Q: API 调用很慢怎么办？
**A**:
1. 检查网络连接
2. 减少设定文件数量（只保留相关的）
3. 考虑使用更快的模型（修改代码中的 `claude-sonnet-4-6`）

### Q: API 费用如何？
**A**:
- 费用取决于 Anthropic 的定价
- 每次生成草案和审查都会调用 API
- 建议在 Anthropic 控制台设置使用限额

### Q: 可以使用其他 LLM 吗？
**A**: 可以，但需要修改代码：
1. 替换 `@anthropic-ai/sdk` 为其他 SDK
2. 修改 `routerAgent.js` 和 `reviewCoordinator.js` 中的 API 调用
3. 调整 prompt 格式以适配新模型

## 错误排查

### Q: 测试失败：找不到设定文件
**A**:
1. 确保 `settings/` 目录存在
2. 确保目录中至少有一个 `.md` 文件
3. 检查文件权限

### Q: 测试失败：API Key 错误
**A**:
1. 检查 `.env` 文件是否存在
2. 检查 API Key 格式（应以 `sk-ant-` 开头）
3. 在 Anthropic 控制台验证 Key 是否有效

### Q: Claude Code 找不到 MCP Server
**A**:
1. 检查配置文件路径是否正确
2. 确保使用绝对路径（不是相对路径）
3. 检查 Node.js 是否在 PATH 中
4. 重启 Claude Code
5. 查看 Claude Code 的日志输出

### Q: 运行时出现 "Cannot find module" 错误
**A**:
1. 确保已运行 `npm install`
2. 检查 `package.json` 中 `"type": "module"` 是否存在
3. 删除 `node_modules` 后重新安装：
   ```bash
   rm -rf node_modules
   npm install
   ```

## 高级用法

### Q: 如何批量处理多个设定？
**A**: 可以编写脚本调用 MCP Server 的工具，或在 Claude Code 中一次提出多个需求。

### Q: 可以导出设定为其他格式吗？
**A**: 当前版本使用 Markdown。你可以：
1. 使用 Pandoc 转换为其他格式
2. 编写脚本解析 Markdown 并导出为 JSON/数据库
3. 扩展 `settingManager.js` 添加导出功能

### Q: 如何实现设定的版本历史？
**A**:
1. 使用 Git 管理 `settings/` 目录
2. 每次重要修改后提交
3. 使用 Git 标签标记重要版本

### Q: 可以多人协作吗？
**A**:
- 当前版本是单用户设计
- 可以通过 Git 实现协作（类似代码协作）
- 未来版本可能支持多用户和冲突解决

## 贡献和支持

### Q: 如何报告 Bug？
**A**: 在项目的 GitHub Issues 中提交问题报告。

### Q: 可以贡献代码吗？
**A**: 欢迎！提交 Pull Request 即可。

### Q: 有社区或讨论组吗？
**A**: 查看项目 README 中的联系方式。

---

**还有其他问题？**
- 查看 [USAGE.md](./USAGE.md) 了解详细用法
- 查看 [STRUCTURE.md](./STRUCTURE.md) 了解技术细节
- 查看代码注释了解实现原理