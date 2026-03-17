import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 设定文件管理器
 * 负责读取、解析和更新 Markdown 设定文件
 */
export class SettingManager {
  constructor() {
    // 设定文件存放目录
    this.settingsDir = path.join(process.cwd(), 'settings');
  }

  /**
   * 列出所有设定文件
   */
  async listSettingFiles() {
    try {
      const files = await fs.readdir(this.settingsDir);
      return files.filter(f => f.endsWith('.md'));
    } catch (error) {
      console.error('读取设定目录失败:', error);
      return [];
    }
  }

  /**
   * 读取指定的设定文件
   */
  async readSettingFile(fileName) {
    const filePath = path.join(this.settingsDir, fileName);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`无法读取文件 ${fileName}: ${error.message}`);
    }
  }

  /**
   * 读取多个设定文件
   */
  async readMultipleFiles(fileNames) {
    const results = {};
    for (const fileName of fileNames) {
      try {
        results[fileName] = await this.readSettingFile(fileName);
      } catch (error) {
        console.error(`读取 ${fileName} 失败:`, error);
        results[fileName] = null;
      }
    }
    return results;
  }

  /**
   * 解析 Markdown 文件为结构化的章节
   */
  parseMarkdown(content) {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = null;

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          level: headerMatch[1].length,
          title: headerMatch[2].trim(),
          content: '',
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * 将设定内容写入指定文件
   */
  async commitSetting(draft, targetFiles) {
    const results = [];

    for (const fileName of targetFiles) {
      try {
        const filePath = path.join(this.settingsDir, fileName);

        // 读取现有内容
        let existingContent = '';
        try {
          existingContent = await fs.readFile(filePath, 'utf-8');
        } catch (error) {
          // 文件不存在，将创建新文件
        }

        // 追加新内容
        const newContent = existingContent + '\n\n' + draft;
        await fs.writeFile(filePath, newContent, 'utf-8');

        results.push({
          file: fileName,
          status: 'success',
          message: '设定已成功写入',
        });
      } catch (error) {
        results.push({
          file: fileName,
          status: 'error',
          message: error.message,
        });
      }
    }

    return results;
  }

  /**
   * 获取所有设定文件的内容摘要
   */
  async getAllSettingsSummary() {
    const files = await this.listSettingFiles();
    const summary = {};

    for (const file of files) {
      const content = await this.readSettingFile(file);
      const sections = this.parseMarkdown(content);
      summary[file] = {
        sectionCount: sections.length,
        sections: sections.map(s => ({
          level: s.level,
          title: s.title,
          contentLength: s.content.length,
        })),
      };
    }

    return summary;
  }
}
