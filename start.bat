@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ===================================
echo 小说设定集管理 MCP Server
echo ===================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js 版本: %NODE_VERSION%

REM 检查依赖
if not exist "node_modules" (
    echo.
    echo 📦 安装依赖...
    call npm install
)

REM 检查环境变量文件
if not exist ".env" (
    echo.
    echo ⚠️  未找到 .env 文件
    echo 请复制 .env.example 为 .env 并填入你的 API Key
    echo.
    echo   copy .env.example .env
    echo.
    pause
    exit /b 1
)

REM 检查 API Key
findstr /C:"sk-ant-" .env >nul
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  请在 .env 文件中设置你的 ANTHROPIC_API_KEY
    pause
    exit /b 1
)

REM 检查设定文件目录
if not exist "settings" (
    echo.
    echo 📁 创建 settings 目录...
    mkdir settings
)

echo.
echo ✓ 环境检查完成
echo.
echo ===================================
echo 启动 MCP Server...
echo ===================================
echo.

REM 加载环境变量
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    set "%%a=%%b"
)

REM 启动服务器
node src/index.js

pause