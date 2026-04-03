#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

const inputDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.cwd(), 'settings', 'base', 'new', 'skill');

const outputFile = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(inputDir, 'merged-skills.md');

async function collectSkillFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const nested = await collectSkillFiles(fullPath);
      results.push(...nested);
      continue;
    }

    if (!entry.name.endsWith('skill.md')) {
      continue;
    }

    results.push(fullPath);
  }

  return results.sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function toRelativePath(filePath, baseDir) {
  return path.relative(baseDir, filePath).replace(/\\/g, '/');
}

async function main() {
  const stat = await fs.stat(inputDir).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`输入目录不存在: ${inputDir}`);
  }

  const skillFiles = await collectSkillFiles(inputDir);
  if (skillFiles.length === 0) {
    throw new Error(`目录下没有找到 skill.md 文件: ${inputDir}`);
  }

  const sections = [];
  sections.push(`# Merged Skills`);
  sections.push('');
  sections.push(`- Source Directory: ${inputDir}`);
  sections.push(`- File Count: ${skillFiles.length}`);
  sections.push('');

  for (const filePath of skillFiles) {
    const content = await fs.readFile(filePath, 'utf8');
    sections.push(`---`);
    sections.push('');
    sections.push(`## ${toRelativePath(filePath, inputDir)}`);
    sections.push('');
    sections.push(content.trimEnd());
    sections.push('');
  }

  await fs.writeFile(outputFile, sections.join('\n'), 'utf8');

  console.log(`已合并 ${skillFiles.length} 个 skill 文件`);
  console.log(`输出文件: ${outputFile}`);
}

main().catch((error) => {
  console.error('合并失败:', error.message);
  process.exit(1);
});
