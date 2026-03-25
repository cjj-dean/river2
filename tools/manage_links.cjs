/**
 * ============================================================================
 * 知识图谱双向链接管理工具 (manage_links.cjs)
 * ============================================================================
 * 【作用说明】
 * 扫描项目内所有 Markdown 文档，检查并维护双向链接的健康状态，确保知识图谱闭环。
 *
 * 【核心功能】
 * 1. 死链检测：找出引用了不存在的文件（如 [[未创建卡片]]）的链接。
 * 2. 单向引用检测：找出 A 引用了 B，但 B 末尾没有反向引用 A 的情况。
 * 3. 孤立卡片检测：找出未被任何文档引用的游离卡片。
 * 4. 自动修复 (--fix)：自动将缺失的反向链接（如 `- [[源文档]]`）追加到目标文档末尾的“反向引用”章节。
 * 
 * 【使用方法】
 * 查看检测报告：node tools/manage_links.cjs
 * 自动修复链接：node tools/manage_links.cjs --fix
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');

// 接收命令行参数
const args = process.argv.slice(2);
const doFix = args.includes('--fix');

// 默认扫描 settings 目录
const SETTINGS_DIR = path.join(__dirname, '..', 'settings');

// 递归获取所有 markdown 文件
function getAllMdFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules') {
                getAllMdFiles(filePath, fileList);
            }
        } else if (file.endsWith('.md')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

// 提取内容中的双向链接
function getLinks(content) {
    const regex = /\[\[(.*?)\]\]/g;
    const links = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        let link = match[1];
        if (link.includes('|')) link = link.split('|')[0];
        if (link.includes('#')) link = link.split('#')[0];
        link = link.trim();
        if (link) links.push(link);
    }
    return links;
}

function main() {
    const allFiles = getAllMdFiles(SETTINGS_DIR);
    const fileMap = new Map();
    const cards = new Set();
    const nonCards = new Set();

    // 建立 basename -> 文件绝对路径的映射
    allFiles.forEach(file => {
        const basename = path.basename(file, '.md');
        fileMap.set(basename, file);
        
        const normalizedFile = file.replace(/\\/g, '/');
        if (normalizedFile.includes('/卡片/')) {
            cards.add(basename);
        } else {
            nonCards.add(basename);
        }
    });

    const graph = new Map();
    const reverseGraph = new Map();

    for (const basename of fileMap.keys()) {
        graph.set(basename, new Set());
        reverseGraph.set(basename, new Set());
    }

    // 构建正向与反向引用图
    allFiles.forEach(file => {
        const sourceBase = path.basename(file, '.md');
        const content = fs.readFileSync(file, 'utf-8');
        const links = getLinks(content);
        
        links.forEach(target => {
            graph.get(sourceBase).add(target);
            
            if (!reverseGraph.has(target)) {
                reverseGraph.set(target, new Set());
            }
            reverseGraph.get(target).add(sourceBase);
        });
    });

    console.log("=".repeat(70));
    console.log(" 🔗 知识图谱双向链接管理工具");
    console.log("=".repeat(70));

    // 分析结果容器
    let brokenLinks = [];
    let oneWayLinks = new Map(); // target -> Set of sources (哪些 source 引用了 target，但 target 没反向引用)
    let orphanCards = [];

    // 1. 识别死链
    graph.forEach((targets, source) => {
        targets.forEach(target => {
            if (!fileMap.has(target)) {
                brokenLinks.push({ source, target });
            }
        });
    });

    // 2. 识别单向引用
    graph.forEach((targets, source) => {
        targets.forEach(target => {
            if (fileMap.has(target)) {
                const targetLinks = graph.get(target);
                if (!targetLinks || !targetLinks.has(source)) {
                    if (!oneWayLinks.has(target)) {
                        oneWayLinks.set(target, new Set());
                    }
                    oneWayLinks.get(target).add(source);
                }
            }
        });
    });

    // 3. 识别孤立卡片
    cards.forEach(card => {
        const linkedBy = reverseGraph.get(card);
        if (!linkedBy || linkedBy.size === 0) {
            orphanCards.push(card);
        }
    });

    // ==========================================
    // 打印检测报告
    // ==========================================

    console.log("\n[1] ❌ 死链检测 (Broken Links):");
    if (brokenLinks.length === 0) {
        console.log("  ✅ 无死链，所有引用均指向已存在的文件。");
    } else {
        const brokenBySource = {};
        brokenLinks.forEach(({source, target}) => {
            if (!brokenBySource[source]) brokenBySource[source] = [];
            brokenBySource[source].push(target);
        });
        let counter = 0;
        for (const [source, targets] of Object.entries(brokenBySource)) {
                console.log(`  - [${source}.md] 引用了不存在的文件: ${targets.map(t => `[[${t}]]`).join(', ')}`);
            counter++;
        }
    }

    let oneWayCount = 0;
    oneWayLinks.forEach(sources => oneWayCount += sources.size);
    
    console.log("\n[2] ⚠️ 单向引用检测 (One-way Links):");
    if (oneWayCount === 0) {
        console.log("  ✅ 所有链接均已实现完美的双向闭环。");
    } else {
        console.log(`  - 发现了 ${oneWayCount} 处单向引用关系，涉及到 ${oneWayLinks.size} 个目标文档。`);
        if (!doFix) {
            console.log("  💡 提示: 您可以运行 `node manage_links.cjs --fix` 自动将缺失的反向链接补充到文件末尾。");
        }
    }

    console.log("\n[3] 👻 孤立卡片检测 (Orphan Cards):");
    if (orphanCards.length === 0) {
        console.log("  ✅ 无孤立卡片，所有卡片均已被其他文档有效引用。");
    } else {
        orphanCards.forEach(c => {
            console.log(`  - [${c}.md] 没有任何文档引用它。`);
        });
    }

    console.log("\n" + "-".repeat(70));
    console.log(`📊 统计结果: 死链 ${brokenLinks.length} 处 | 单向引用 ${oneWayCount} 处 | 孤立卡片 ${orphanCards.length} 张`);
    console.log("-".repeat(70) + "\n");

    // ==========================================
    // 自动修复逻辑 (--fix 触发)
    // ==========================================

    if (doFix && oneWayCount > 0) {
        console.log("=".repeat(70));
        console.log(" 🛠️ 开始自动修复单向引用...");
        console.log("=".repeat(70));
        
        let modifiedCount = 0;

        oneWayLinks.forEach((sources, target) => {
            const filePath = fileMap.get(target);
            let content = fs.readFileSync(filePath, 'utf-8');
            
            const SECTION_HEADER = "## 反向引用";
            
            // 如果不存在“反向引用”章节，就在末尾追加
            if (!content.includes(SECTION_HEADER)) {
                content = content.replace(/\s+$/, '') + `\n\n${SECTION_HEADER}\n`;
            } else {
                if (!content.endsWith('\n')) {
                    content += '\n';
                }
            }
            
            sources.forEach(source => {
                // 确保不要重复添加
                if (!content.includes(`[[${source}]]`)) {
                    content += `- [[${source}]]\n`;
                }
            });
            
            fs.writeFileSync(filePath, content, 'utf-8');
            modifiedCount++;
            console.log(`  [+] 修复 [${target}.md]: 自动追加了 ${sources.size} 个关联链接`);
        });

        console.log(`\n✅ 修复完成，共修改了 ${modifiedCount} 个文档的反向引用！`);
        console.log("   您可以再次运行 `node manage_links.cjs` 查看最新的检测报告。");
    }
}

main();