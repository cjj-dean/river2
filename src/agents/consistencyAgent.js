/**
 * 一致性检查Agent
 * 负责检测文档之间的关联关系和不一致问题
 */

export class ConsistencyAgent {
  constructor(settingManager) {
    this.settingManager = settingManager;

    // 定义文档之间的关联关系
    this.documentRelations = {
      '主角成长路线图.md': [
        '主要角色（粗略）.md',
        '功法与术法大全.md',
        '法宝图鉴.md',
        '历史世界时间线(粗略）.md'
      ],
      '主要角色（粗略）.md': [
        '主角成长路线图.md',
        '功法与术法大全.md',
        '法宝图鉴.md',
        '势力与宗门.md'
      ],
      '功法与术法大全.md': [
        '主要角色（粗略）.md',
        '主角成长路线图.md',
        '势力与宗门.md'
      ],
      '法宝图鉴.md': [
        '主要角色（粗略）.md',
        '主角成长路线图.md'
      ],
      '世界之谜和答案.md': [
        '历史世界时间线(粗略）.md',
        '主角成长路线图.md'
      ],
      '历史世界时间线(粗略）.md': [
        '世界之谜和答案.md',
        '主要角色（粗略）.md'
      ]
    };
  }

  /**
   * 检查文档修改后需要同步的关联文档
   * @param {string} modifiedFile - 被修改的文件名
   * @param {string} modifiedContent - 修改后的内容
   * @returns {Promise<Object>} 同步建议
   */
  async checkConsistency(modifiedFile, modifiedContent) {
    const relatedFiles = this.documentRelations[modifiedFile] || [];

    if (relatedFiles.length === 0) {
      return {
        needsSync: false,
        message: '该文档没有定义关联文档'
      };
    }

    // 提取修改内容中的关键实体
    const entities = this.extractEntities(modifiedContent);

    // 检查每个关联文档
    const syncSuggestions = [];

    for (const relatedFile of relatedFiles) {
      try {
        const relatedContent = await this.settingManager.readSettingFile(relatedFile);
        const conflicts = this.detectConflicts(
          modifiedFile,
          entities,
          relatedFile,
          relatedContent
        );

        if (conflicts.length > 0) {
          syncSuggestions.push({
            file: relatedFile,
            conflicts: conflicts,
            priority: this.calculatePriority(conflicts)
          });
        }
      } catch (error) {
        console.error(`无法读取关联文档 ${relatedFile}:`, error.message);
      }
    }

    return {
      needsSync: syncSuggestions.length > 0,
      modifiedFile: modifiedFile,
      relatedFiles: relatedFiles,
      syncSuggestions: syncSuggestions.sort((a, b) => b.priority - a.priority),
      entities: entities
    };
  }

  /**
   * 从文档中提取关键实体
   * @param {string} content - 文档内容
   * @returns {Object} 提取的实体
   */
  extractEntities(content) {
    const entities = {
      characters: [],
      techniques: [],
      treasures: [],
      realms: [],
      locations: [],
      events: []
    };

    // 提取角色名称（中文名，2-4个字）
    const characterPattern = /(?:^|\s|【|】|、|，|。)([一-龥]{2,4})(?=[\s，。、：（）【】]|$)/g;
    const characterMatches = content.matchAll(characterPattern);
    for (const match of characterMatches) {
      const name = match[1];
      // 过滤常见词汇
      if (!this.isCommonWord(name) && !entities.characters.includes(name)) {
        entities.characters.push(name);
      }
    }

    // 提取功法名称（【】包裹）
    const techniquePattern = /【([^】]+(?:诀|法|术|功|拳|剑|阵))】/g;
    const techniqueMatches = content.matchAll(techniquePattern);
    for (const match of techniqueMatches) {
      if (!entities.techniques.includes(match[1])) {
        entities.techniques.push(match[1]);
      }
    }

    // 提取法宝名称（【】包裹，非功法）
    const treasurePattern = /【([^】]+(?:剑|刀|枪|盾|符|珠|玉|镜|钟|鼎|印|笔|尺|伞|算盘|残玉|玉牌|玉玺))】/g;
    const treasureMatches = content.matchAll(treasurePattern);
    for (const match of treasureMatches) {
      if (!entities.treasures.includes(match[1])) {
        entities.treasures.push(match[1]);
      }
    }

    // 提取境界名称
    const realmPattern = /(铁骨境|铜血境|摧城境|断江境|镇海境|撼星境|无漏境|武神境|凝窍境|观骨境|叩关境|筑鼎境|寻泉境|玉枢境|忘筌境|天命境)/g;
    const realmMatches = content.matchAll(realmPattern);
    for (const match of realmMatches) {
      if (!entities.realms.includes(match[1])) {
        entities.realms.push(match[1]);
      }
    }

    // 提取地点名称
    const locationPattern = /(中土神洲|东临剑洲|北冥霜洲|南疆|西域|葬剑海|十万大山|太衍山脉|归墟|洗剑池|太一玄宗|白鹿书院|天机阁|大奉仙朝)/g;
    const locationMatches = content.matchAll(locationPattern);
    for (const match of locationMatches) {
      if (!entities.locations.includes(match[1])) {
        entities.locations.push(match[1]);
      }
    }

    return entities;
  }

  /**
   * 检测两个文档之间的冲突
   * @param {string} sourceFile - 源文件名
   * @param {Object} sourceEntities - 源文件的实体
   * @param {string} targetFile - 目标文件名
   * @param {string} targetContent - 目标文件内容
   * @returns {Array} 冲突列表
   */
  detectConflicts(sourceFile, sourceEntities, targetFile, targetContent) {
    const conflicts = [];

    // 检查角色相关冲突
    for (const character of sourceEntities.characters) {
      if (targetContent.includes(character)) {
        // 检查境界是否一致
        const sourceRealms = this.extractCharacterRealm(sourceFile, character);
        const targetRealms = this.extractCharacterRealm(targetContent, character);

        if (sourceRealms && targetRealms && sourceRealms !== targetRealms) {
          conflicts.push({
            type: 'realm_mismatch',
            entity: character,
            entityType: 'character',
            sourceValue: sourceRealms,
            targetValue: targetRealms,
            description: `角色"${character}"的境界不一致`,
            suggestion: `建议将 ${targetFile} 中的"${character}"境界更新为"${sourceRealms}"`
          });
        }
      }
    }

    // 检查功法相关冲突
    for (const technique of sourceEntities.techniques) {
      if (targetContent.includes(technique)) {
        conflicts.push({
          type: 'technique_reference',
          entity: technique,
          entityType: 'technique',
          description: `功法"${technique}"在两个文档中都有提及`,
          suggestion: `建议检查 ${targetFile} 中"${technique}"的描述是否与 ${sourceFile} 一致`
        });
      }
    }

    // 检查法宝相关冲突
    for (const treasure of sourceEntities.treasures) {
      if (targetContent.includes(treasure)) {
        conflicts.push({
          type: 'treasure_reference',
          entity: treasure,
          entityType: 'treasure',
          description: `法宝"${treasure}"在两个文档中都有提及`,
          suggestion: `建议检查 ${targetFile} 中"${treasure}"的归属和品阶是否与 ${sourceFile} 一致`
        });
      }
    }

    return conflicts;
  }

  /**
   * 从内容中提取角色的境界
   * @param {string} content - 文档内容
   * @param {string} character - 角色名称
   * @returns {string|null} 境界名称
   */
  extractCharacterRealm(content, character) {
    // 匹配 "角色名 + 境界" 的模式
    const realmPattern = new RegExp(`${character}[^。]{0,50}?(铁骨境|铜血境|摧城境|断江境|镇海境|撼星境|无漏境|武神境|凝窍境|观骨境|叩关境|筑鼎境|寻泉境|玉枢境|忘筌境|天命境)`);
    const match = content.match(realmPattern);
    return match ? match[1] : null;
  }

  /**
   * 计算同步优先级
   * @param {Array} conflicts - 冲突列表
   * @returns {number} 优先级分数
   */
  calculatePriority(conflicts) {
    let priority = 0;
    for (const conflict of conflicts) {
      switch (conflict.type) {
        case 'realm_mismatch':
          priority += 10; // 境界不一致是高优先级
          break;
        case 'technique_reference':
          priority += 5;
          break;
        case 'treasure_reference':
          priority += 5;
          break;
        default:
          priority += 1;
      }
    }
    return priority;
  }

  /**
   * 判断是否为常见词汇（需要过滤）
   * @param {string} word - 词汇
   * @returns {boolean}
   */
  isCommonWord(word) {
    const commonWords = [
      '这个', '那个', '什么', '怎么', '为什么', '因为', '所以', '但是', '如果',
      '可以', '不能', '应该', '必须', '需要', '时候', '地方', '东西', '事情',
      '问题', '方法', '办法', '情况', '时间', '空间', '世界', '天地', '人间',
      '修炼', '境界', '功法', '法宝', '灵气', '天道', '大道', '法则', '神识',
      '开篇', '前期', '中期', '后期', '结局', '最终', '关键', '重要', '主要'
    ];
    return commonWords.includes(word);
  }

  /**
   * 生成同步建议的详细报告
   * @param {Object} consistencyResult - 一致性检查结果
   * @returns {string} 格式化的报告
   */
  generateSyncReport(consistencyResult) {
    if (!consistencyResult.needsSync) {
      return '✅ 未检测到需要同步的内容';
    }

    let report = `📋 文档一致性检查报告\n\n`;
    report += `修改文件: ${consistencyResult.modifiedFile}\n`;
    report += `关联文档: ${consistencyResult.relatedFiles.join(', ')}\n\n`;

    report += `🔍 检测到的实体:\n`;
    if (consistencyResult.entities.characters.length > 0) {
      report += `  角色: ${consistencyResult.entities.characters.slice(0, 10).join('、')}${consistencyResult.entities.characters.length > 10 ? '...' : ''}\n`;
    }
    if (consistencyResult.entities.techniques.length > 0) {
      report += `  功法: ${consistencyResult.entities.techniques.slice(0, 5).join('、')}${consistencyResult.entities.techniques.length > 5 ? '...' : ''}\n`;
    }
    if (consistencyResult.entities.treasures.length > 0) {
      report += `  法宝: ${consistencyResult.entities.treasures.slice(0, 5).join('、')}${consistencyResult.entities.treasures.length > 5 ? '...' : ''}\n`;
    }

    report += `\n⚠️ 需要同步的文档 (${consistencyResult.syncSuggestions.length}个):\n\n`;

    for (const suggestion of consistencyResult.syncSuggestions) {
      report += `📄 ${suggestion.file} (优先级: ${suggestion.priority})\n`;
      for (const conflict of suggestion.conflicts) {
        report += `  • ${conflict.description}\n`;
        report += `    建议: ${conflict.suggestion}\n`;
      }
      report += `\n`;
    }

    return report;
  }
}
