/**
 * ============================================================================
 * 自动包链替换工具 (auto_link_worldview.cjs)
 * ============================================================================
 * 【作用说明】
 * 扫描指定目录(如`卡片`目录)下的所有Markdown文件名(去除后缀)，
 * 在目标目录下的所有md文件，全文检索这些名词，并自动将它们包裹成 `[[名词]]`
 * 的双向链接格式。
 * 
 * 采用“先保护后替换”的安全策略，不会破坏已有 `[[ ]]` 的链接，防止出现
 * `[[10-[[太一玄宗]]·道统篇]]` 这类嵌套错误。
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');

const CARDS_DIR = path.join(__dirname, '..', 'settings', '卡片');
const TARGET_DIR = path.join(__dirname, '..', 'settings');

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

function main() {
    console.log("=".repeat(70));
    console.log(" 🔗 自动包链替换工具启动...");
    console.log("=".repeat(70));

    const cardFiles = getAllMdFiles(CARDS_DIR);
    let cardNames = cardFiles.map(f => path.basename(f, '.md'));
    
    const ignoreList = [
        '地理类型', '行政级别', '相对坐标', '繁荣度', '相对半径', 
        '所属父级', '地理轮廓描述', '核心地理屏障', '次级势力', 
        '地理卡片模板', '某人物', '某势力', '子地点A', '子地点B', 
        '相邻地点', '父级地点名', '地点名'
    ];
    cardNames = cardNames.filter(name => !ignoreList.includes(name));
    cardNames.sort((a, b) => b.length - a.length);

    console.log(`[+] 成功提取 ${cardNames.length} 个词条作为链接词库。`);

    if (!fs.existsSync(TARGET_DIR)) {
        console.error(`目标目录不存在: ${TARGET_DIR}`);
        return;
    }
    const targetFiles = getAllMdFiles(TARGET_DIR);
    console.log(`[+] 找到 ${targetFiles.length} 个目标 Markdown 文件，准备执行替换。`);

    let totalModifiedFiles = 0;
    let totalReplacedTerms = 0;

    targetFiles.forEach(filePath => {
        let content = fs.readFileSync(filePath, 'utf-8');
        let fileModifiedCount = 0;
        const currentFileBasename = path.basename(filePath, '.md');

        // 【核心安全策略】：先将文档中已存在的 [[...]] 链接替换为占位符保护起来
        // 同时也把 Markdown 标题 # xxx 保护起来，避免包裹后影响结构（可选）
        const stashedLinks = [];
        content = content.replace(/\[\[(.*?)\]\]/g, (match) => {
            const placeholder = `__STASHED_LINK_${stashedLinks.length}__`;
            stashedLinks.push(match);
            return placeholder;
        });

        // 进行全文实体词替换
        cardNames.forEach(name => {
            if (currentFileBasename === name) return;

            // 由于已经把链接变成了占位符，现在可以直接做全局安全替换
            // 只要避免替换到 YAML 头（可做进一步完善）或者一般文本中的词汇
            // 简单的正则：匹配独立出现的名词 (避免匹配英文字母中间的，但这里是中文所以可以直接替换)
            const regex = new RegExp(`(${name})`, 'g');
            
            if (regex.test(content)) {
                content = content.replace(regex, `[[$1]]`);
                fileModifiedCount++;
                totalReplacedTerms++;
            }
        });

        // 恢复被保护的链接
        stashedLinks.forEach((stashedMatch, index) => {
            const placeholder = `__STASHED_LINK_${index}__`;
            content = content.replace(placeholder, stashedMatch);
        });

        if (fileModifiedCount > 0) {
            fs.writeFileSync(filePath, content, 'utf-8');
            totalModifiedFiles++;
            console.log(`  - 已更新 [${currentFileBasename}.md] (处理了 ${fileModifiedCount} 种独立词汇)`);
        }
    });

    console.log("=".repeat(70));
    console.log(`✅ 批量替换完成！共修改了 ${totalModifiedFiles} 个文件，共执行了 ${totalReplacedTerms} 次词条转换。`);
    console.log("=".repeat(70));
}

main();