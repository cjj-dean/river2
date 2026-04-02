#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

const defaultDir = path.join(process.cwd(), 'settings', 'base', 'new');

const rootDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : defaultDir;

const ignoredDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
]);

const ignoredFiles = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
]);

function countCharacters(text) {
  return [...text].length;
}

function isLikelyTextFile(content) {
  return !content.includes('\u0000');
}

async function walk(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        await walk(fullPath, files);
      }
      continue;
    }

    if (ignoredFiles.has(entry.name)) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

async function main() {
  const allFiles = await walk(rootDir);
  let scannedFiles = 0;
  let countedFiles = 0;
  let totalChars = 0;
  let totalNonWhitespaceChars = 0;

  for (const filePath of allFiles) {
    scannedFiles += 1;

    try {
      const content = await fs.readFile(filePath, 'utf8');
      if (!isLikelyTextFile(content)) {
        continue;
      }

      countedFiles += 1;
      totalChars += countCharacters(content);
      totalNonWhitespaceChars += countCharacters(
        content.replace(/\s+/g, '')
      );
    } catch {
      // Ignore unreadable or non-text files.
    }
  }

  console.log(`统计目录: ${rootDir}`);
  console.log(`扫描文件数: ${scannedFiles}`);
  console.log(`计入文本文件数: ${countedFiles}`);
  console.log(`总字数(含空白): ${totalChars}`);
  console.log(`总字数(不含空白): ${totalNonWhitespaceChars}`);
}

main().catch((error) => {
  console.error('统计失败:', error.message);
  process.exit(1);
});
