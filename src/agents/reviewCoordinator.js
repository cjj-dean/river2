import Anthropic from '@anthropic-ai/sdk';

/**
 * Review Coordinator - 审查协调器
 * 协调多个专业审查 Agent 对设定草案进行审查
 */
export class ReviewCoordinator {
  constructor(settingManager) {
    this.settingManager = settingManager;
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // 定义各个审查 Agent 的配置
    this.reviewers = [
      {
        name: '战力审查官',
        role: 'power_reviewer',
        files: ['流派和等级体系.md', '金手指.md', '世界观.md'],
        prompt: `你是一个严格的战力体系审查官。请检查草案中的战力设定是否与现有体系冲突。

重点关注：
1. 力量等级是否符合现有体系
2. 能力描述是否违反世界观的底层法则
3. 是否存在过于强大或过于弱小的不合理设定
4. 与其他势力/人物的战力对比是否合理

请指出所有潜在冲突，并给出修改建议。`,
      },
      {
        name: '资源/经济审查官',
        role: 'economy_reviewer',
        files: ['货币体系.md', '地图与势力分布.md'],
        prompt: `你是一个苛刻的经济学家。请检查草案中的资源和经济设定是否合理。

重点关注：
1. 资源分布是否与地理设定冲突
2. 经济规模是否符合势力体量
3. 货币和交易描述是否符合现有体系
4. 资源获取方式是否合理

请指出所有经济漏洞，并给出修改建议。`,
      },
      {
        name: '考据与时间线审查官',
        role: 'timeline_reviewer',
        files: ['历史事件时间线.md', '世界观.md'],
        prompt: `你是一个严谨的历史考据专家。请检查草案中的时间线和历史设定是否与现有记录冲突。

重点关注：
1. 时间点是否与已有事件冲突
2. 历史渊源是否符合世界观发展脉络
3. 因果关系是否合理
4. 是否填补了时间线的空白

请指出所有时间线冲突，并给出修改建议。`,
      },
    ];
  }

  /**
   * 审查设定草案
   */
  async reviewDraft(draft) {
    const reviews = [];

    for (const reviewer of this.reviewers) {
      try {
        const review = await this.runReviewer(reviewer, draft);
        reviews.push({
          reviewer: reviewer.name,
          role: reviewer.role,
          feedback: review,
        });
      } catch (error) {
        reviews.push({
          reviewer: reviewer.name,
          role: reviewer.role,
          error: error.message,
        });
      }
    }

    // 汇总审查结果
    const summary = await this.summarizeReviews(draft, reviews);

    return {
      reviews,
      summary,
      hasConflicts: reviews.some(r => r.feedback && r.feedback.includes('冲突')),
    };
  }

  /**
   * 运行单个审查 Agent
   */
  async runReviewer(reviewer, draft) {
    // 读取相关的设定文件
    const fileContents = await this.settingManager.readMultipleFiles(reviewer.files);

    // 构建上下文
    let context = '# 相关设定文件\n\n';
    for (const [fileName, content] of Object.entries(fileContents)) {
      if (content) {
        context += `## ${fileName}\n\n${content}\n\n`;
      }
    }

    const userPrompt = `${context}\n\n# 待审查的设定草案\n\n${draft}\n\n请进行审查并给出反馈。`;

    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: reviewer.prompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      return message.content[0].text;
    } catch (error) {
      throw new Error(`审查失败: ${error.message}`);
    }
  }

  /**
   * 汇总所有审查结果
   */
  async summarizeReviews(draft, reviews) {
    const reviewTexts = reviews
      .map(r => `## ${r.reviewer}\n\n${r.feedback || r.error}`)
      .join('\n\n');

    const systemPrompt = `你是一个设定编辑主管。请汇总所有审查官的反馈，给出最终的修改建议。

要求：
1. 整合所有冲突点
2. 按优先级排序修改建议
3. 如果没有冲突，说明草案可以通过
4. 给出修改后的完整草案（如果需要修改）`;

    const userPrompt = `# 原始草案\n\n${draft}\n\n# 审查反馈\n\n${reviewTexts}\n\n请给出汇总和修改建议。`;

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
      return `汇总失败: ${error.message}`;
    }
  }
}
