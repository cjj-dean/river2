/**
 * ============================================================================
 * Web 工具箱控制台 (web_runner.cjs)
 * ============================================================================
 * 【作用说明】
 * 这是一个轻量级的本地 Node.js 服务器，提供了一个 Web 界面。
 * 允许用户直接在浏览器中点击按钮，来调用和执行 tools 目录下的各种脚本，
 * 并将控制台输出实时显示在网页上。
 * ============================================================================
 */
const http = require('http');
const { exec } = require('child_process');
const path = require('path');

const PORT = 3000;

// 网页前端 HTML
const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>设定集自动化工具箱</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f4f6f8; 
            color: #333;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h1 { 
            margin-top: 0; 
            color: #2c3e50; 
            border-bottom: 2px solid #3498db; 
            padding-bottom: 10px;
        }
        .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px; 
            margin: 20px 0; 
        }
        button { 
            padding: 12px 15px; 
            background: #3498db; 
            color: white; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 15px;
            font-weight: bold;
            transition: background 0.3s, transform 0.1s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        button:hover { 
            background: #2980b9; 
            transform: translateY(-2px);
        }
        button:active {
            transform: translateY(0);
        }
        button:disabled { 
            background: #95a5a6; 
            cursor: not-allowed; 
            transform: none;
        }
        .danger {
            background: #e74c3c;
        }
        .danger:hover {
            background: #c0392b;
        }
        .success {
            background: #2ecc71;
        }
        .success:hover {
            background: #27ae60;
        }
        #output { 
            background: #1e1e1e; 
            color: #00ff00; 
            padding: 15px; 
            border-radius: 6px; 
            height: 400px; 
            overflow-y: auto; 
            white-space: pre-wrap; 
            font-family: 'Consolas', monospace;
            font-size: 14px;
            line-height: 1.5;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛠️ 设定集自动化工具箱 (Tools Dashboard)</h1>
        
        <h3>知识图谱链接管理</h3>
        <div class="grid">
            <button onclick="runCmd('node manage_links.cjs')">🔍 检测双向链接状态</button>
            <button class="danger" onclick="runCmd('node manage_links.cjs --fix')">🔧 自动修复缺失链接</button>
            <button class="success" onclick="runCmd('node auto_link_worldview.cjs')">🔗 全局名自动包链</button>
        </div>

        <h3>地理模块自动化</h3>
        <div class="grid">
            <button onclick="runCmd('python format_geo_cards.py')">🌍 批量格式化地理卡片</button>
            <button onclick="runCmd('python organize_continents.py')">📂 地理大洲自动归类</button>
            <button onclick="runCmd('python parse_continents.py')">📊 提取统计大洲信息</button>
        </div>

        <h3>执行日志输出：</h3>
        <pre id="output">等待指令执行...</pre>
    </div>

    <script>
        async function runCmd(cmd) {
            const out = document.getElementById('output');
            const btns = document.querySelectorAll('button');
            
            // 锁定所有按钮防止重复点击
            btns.forEach(b => b.disabled = true);
            out.textContent = '▶ 开始执行指令: ' + cmd + '\\n' + '-'.repeat(50) + '\\n\\n';
            
            try {
                const res = await fetch('/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cmd })
                });
                const data = await res.text();
                out.textContent += data;
                
                // 自动滚动到底部
                out.scrollTop = out.scrollHeight;
            } catch (e) {
                out.textContent += '❌ 请求服务器失败: ' + e.message;
            } finally {
                btns.forEach(b => b.disabled = false);
            }
        }
    </script>
</body>
</html>
`;

// 创建轻量级 HTTP 服务器
const server = http.createServer((req, res) => {
    // 处理根目录 GET 请求，返回网页
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
    } 
    // 处理执行命令的 POST 请求
    else if (req.method === 'POST' && req.url === '/run') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { cmd } = JSON.parse(body);
                
                // 安全限制：定义白名单，防止执行恶意系统命令
                const allowedCmds = [
                    'node manage_links.cjs',
                    'node manage_links.cjs --fix',
                    'node auto_link_worldview.cjs',
                    'python format_geo_cards.py',
                    'python organize_continents.py',
                    'python parse_continents.py'
                ];
                
                if (!allowedCmds.includes(cmd)) {
                    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('❌ 拒绝访问：不允许执行该命令');
                    return;
                }

                // 在 tools 目录中执行指定脚本
                exec(cmd, { cwd: __dirname, encoding: 'utf8' }, (error, stdout, stderr) => {
                    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                    let output = stdout;
                    if (stderr) output += '\n[警告/错误信息]\n' + stderr;
                    if (error) output += '\n[执行失败]\n' + error.message;
                    res.end(output || '✅ 脚本执行完毕，无控制台输出内容。');
                });
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('❌ 请求格式错误');
            }
        });
    } 
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
    }
});

server.listen(PORT, () => {
    console.log("=".repeat(50));
    console.log(`✅ Web 工具箱控制台已启动！`);
    console.log(`👉 请按住 Ctrl 并点击或在浏览器中打开: http://localhost:${PORT}`);
    console.log("=".repeat(50));
    console.log(`(按 Ctrl+C 可停止服务器)`);
});
