#!/bin/bash

# 小说设定集管理系统 - 快速启动脚本

echo "==================================="
echo "小说设定集管理 MCP Server"
echo "==================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js 版本: $(node --version)"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 安装依赖..."
    npm install
fi

# 检查环境变量
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  未找到 .env 文件"
    echo "请复制 .env.example 为 .env 并填入你的 API Key"
    echo ""
    echo "  cp .env.example .env"
    echo ""
    exit 1
fi

# 检查 API Key
if ! grep -q "sk-ant-" .env; then
    echo ""
    echo "⚠️  请在 .env 文件中设置你的 ANTHROPIC_API_KEY"
    exit 1
fi

# 检查设定文件目录
if [ ! -d "settings" ]; then
    echo ""
    echo "📁 创建 settings 目录..."
    mkdir -p settings
fi

echo ""
echo "✓ 环境检查完成"
echo ""
echo "==================================="
echo "启动 MCP Server..."
echo "==================================="
echo ""

# 加载环境变量并启动
export $(cat .env | xargs)
node src/index.js