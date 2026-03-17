# 部署检查清单

在开始使用之前，请按照此清单逐项检查：

## ✅ 环境准备

- [ ] 已安装 Node.js (版本 >= 18)
  ```bash
  node --version
  ```

- [ ] 已获取 Anthropic API Key
  - 访问: https://console.anthropic.com/
  - 创建 API Key

## ✅ 项目配置

- [ ] 已安装依赖
  ```bash
  npm install
  ```

- [ ] 已创建 `.env` 文件
  ```bash
  cp .env.example .env
  ```

- [ ] 已在 `.env` 中填入 API Key
  ```
  ANTHROPIC_API_KEY=sk-ant-your-key-here
  ```

- [ ] 已将设定文件放入 `settings/` 目录
  - 至少包含一个 `.md` 文件

## ✅ 功能测试

- [ ] 运行测试脚本
  ```bash
  npm test
  ```

- [ ] 测试输出显示：
  - ✓ 找到设定文件
  - ✓ 成功读取文件
  - ✓ 解析 Markdown 结构
  - ✓ 检测到 API Key

## ✅ MCP 集成（Claude Code）

- [ ] 找到 Claude Code 配置文件
  - Windows: `%USERPROFILE%\.config\claude-code\config.json`
  - Mac/Linux: `~/.config/claude-code/config.json`

- [ ] 添加 MCP Server 配置
  ```json
  {
    "mcpServers": {
      "novel-setting-editor": {
        "command": "node",
        "args": ["你的项目路径/src/index.js"],
        "env": {
          "ANTHROPIC_API_KEY": "你的API Key"
        }
      }
    }
  }
  ```

- [ ] 使用**绝对路径**（不是相对路径）

- [ ] 已重启 Claude Code

## ✅ 首次使用测试

在 Claude Code 中尝试：

- [ ] 列出设定文件
  ```
  请列出所有可用的设定文件
  ```

- [ ] 读取设定内容
  ```
  请读取世界观设定
  ```

- [ ] 提议新设定
  ```
  我想添加一个新的修炼门派
  ```

## ✅ 常见问题排查

### 如果测试失败：

1. **找不到设定文件**
   - 检查 `settings/` 目录是否存在
   - 检查目录中是否有 `.md` 文件

2. **API Key 错误**
   - 检查 `.env` 文件是否存在
   - 检查 API Key 格式是否正确（以 `sk-ant-` 开头）
   - 检查 API Key 是否有效

3. **Claude Code 找不到 MCP Server**
   - 检查配置文件路径是否正确
   - 检查项目路径是否使用绝对路径
   - 检查是否已重启 Claude Code
   - 查看 Claude Code 的日志输出

4. **Node.js 版本过低**
   - 升级到 Node.js 18 或更高版本

## ✅ 备份建议

- [ ] 将 `settings/` 目录纳入版本控制
  ```bash
  git init
  git add settings/
  git commit -m "Initial settings"
  ```

- [ ] 定期备份重要设定文件

## ✅ 性能优化（可选）

- [ ] 如果设定文件很多，考虑实现缓存
- [ ] 如果 API 调用较慢，考虑使用更快的模型
- [ ] 如果需要更精准的文件匹配，考虑集成向量数据库

## 完成！

如果所有检查项都已完成，你的小说设定集管理系统已经准备就绪！

开始使用：
1. 打开 Claude Code
2. 输入你的设定需求
3. 让 AI 帮你管理和扩展小说世界观

祝你创作愉快！📚✨

---

**需要帮助？**
- 查看 [QUICKSTART.md](./QUICKSTART.md) - 快速入门
- 查看 [USAGE.md](./USAGE.md) - 详细使用指南
- 查看 [README.md](./README.md) - 项目说明