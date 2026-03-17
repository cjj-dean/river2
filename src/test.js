import { SettingManager } from './utils/settingManager.js';

/**
 * 简单的测试脚本
 * 验证系统各模块是否正常工作
 */

async function runTests() {
  console.log('开始测试...\n');

  // 测试 1: SettingManager
  console.log('测试 1: 设定文件管理器');
  const settingManager = new SettingManager();

  try {
    const files = await settingManager.listSettingFiles();
    console.log(`✓ 找到 ${files.length} 个设定文件:`);
    files.forEach(f => console.log(`  - ${f}`));
  } catch (error) {
    console.log(`✗ 错误: ${error.message}`);
  }

  console.log('');

  // 测试 2: 读取文件
  console.log('测试 2: 读取设定文件');
  try {
    const content = await settingManager.readSettingFile('世界观.md');
    console.log(`✓ 成功读取 世界观.md (${content.length} 字符)`);
  } catch (error) {
    console.log(`✗ 错误: ${error.message}`);
  }

  console.log('');

  // 测试 3: 解析 Markdown
  console.log('测试 3: 解析 Markdown 结构');
  try {
    const content = await settingManager.readSettingFile('世界观.md');
    const sections = settingManager.parseMarkdown(content);
    console.log(`✓ 解析出 ${sections.length} 个章节:`);
    sections.slice(0, 3).forEach(s => {
      console.log(`  - ${'#'.repeat(s.level)} ${s.title}`);
    });
  } catch (error) {
    console.log(`✗ 错误: ${error.message}`);
  }

  console.log('');

  // 测试 4: 环境变量
  console.log('测试 4: 环境变量');
  if (process.env.ANTHROPIC_API_KEY) {
    const key = process.env.ANTHROPIC_API_KEY;
    const masked = key.substring(0, 10) + '...' + key.substring(key.length - 4);
    console.log(`✓ ANTHROPIC_API_KEY: ${masked}`);
  } else {
    console.log('✗ 未设置 ANTHROPIC_API_KEY');
  }

  console.log('');
  console.log('测试完成！');
}

runTests().catch(console.error);