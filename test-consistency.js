#!/usr/bin/env node

/**
 * 测试一致性检查功能
 */

import { SettingManager } from './src/utils/settingManager.js';
import { ConsistencyAgent } from './src/agents/consistencyAgent.js';

async function testConsistency() {
  console.log('🧪 测试一致性检查功能\n');

  const settingManager = new SettingManager();
  const consistencyAgent = new ConsistencyAgent(settingManager);

  try {
    // 读取主角成长路线图
    console.log('📖 读取主角成长路线图...');
    const content = await settingManager.readSettingFile('主角成长路线图.md');

    // 检查一致性
    console.log('🔍 检查文档一致性...\n');
    const result = await consistencyAgent.checkConsistency('主角成长路线图.md', content);

    // 生成报告
    const report = consistencyAgent.generateSyncReport(result);
    console.log(report);

    // 输出详细结果
    console.log('\n📊 详细结果:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

testConsistency();
