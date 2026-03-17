import Anthropic from '@anthropic-ai/sdk';

/**
 * Router Agent - 主节点
 * 负责接收用户需求，读取相关设定文件，生成设定草案
 */
export class RouterAgent {
  constructor(settingManager) {
    this.settingManager = settingManager;
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * 生成设定草案
   */
  async generateDraft(request, category = '') {
    // 获取所有相关的设定文件
    const files = await this.settingManager.listSettingFiles();
    const relevantFiles = await this.selectRelevantFiles(files, request, category);

    // 读取相关文件内容
    const fileContents = await this.settingManager.readMultipleFiles(relevantFiles);

    // 构建上下文
    let context = '# 现有设定文件\n\n';
    for (const [fileName, content] of Object.entries(fileContents)) {
      if (content) {
        context += `## ${fileName}\n\n${content}\n\n`;
      }
    }

    // 调用 Claude API 生成草案
    const systemPrompt = `你是一个专业的小说世界观设定编辑。你的任务是根据用户的需求和现有的设定文件，生成一份详细的设定草案。

要求：
1. 草案必须与现有设定保持一致的风格和逻辑
2. 包含必要的细节：名称、特点、历史渊源、与其他设定的关联
3. 使用 Markdown 格式组织内容
4. 不要编造与现有设定明显冲突的内容
5. 如果发现潜在冲突，在草案中标注出来`;

    const userPrompt = `${context}\n\n# 用户需求\n\n${request}\n\n${category ? `类别: ${category}` : ''}\n\n请生成详细的设定草案。`;

    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      return message.content[0].text;
    } catch (error) {
      throw new Error(`生成草案失败: ${error.message}`);
    }
  }

  /**
   * 选择与请求相关的设定文件
   */
  async selectRelevantFiles(allFiles, request, category) {
    // 简单的关键词匹配策略
    // 未来可以使用更智能的方法（如向量搜索）
    const keywords = {
      势力: ['势力', '组织', '门派', '流派', '地图', '人物关系'],
      人物: ['人物', '角色', '关系'],
      功法: ['功法', '等级', '体系', '流派'],
      地理: ['地图', '地理', '势力分布'],
      经济: ['货币', '资源', '经济'],
      历史: ['历史', '时间线', '事件'],
    };

    const relevantFiles = new Set();

    // 根据类别添加相关文件
    if (category && keywords[category]) {
      for (const file of allFiles) {
        for (const keyword of keywords[category]) {
          if (file.includes(keyword)) {
            relevantFiles.add(file);
          }
        }
      }
    }

    // 根据请求内容添加相关文件
    for (const file of allFiles) {
      const fileName = file.replace('.md', '');
      if (request.includes(fileName) || fileName.includes(request.slice(0, 5))) {
        relevantFiles.add(file);
      }
    }

    // 如果没有匹配到，返回所有文件（让 LLM 自己判断）
    if (relevantFiles.size === 0) {
      return allFiles;
    }

    return Array.from(relevantFiles);
  }
}
