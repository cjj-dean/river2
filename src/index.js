#!/usr/bin/env node

/**
 * 小说设定集管理 MCP Server
 * 提供设定冲突检测和知识图谱补全功能
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { SettingManager } from './utils/settingManager.js';
import { RouterAgent } from './agents/routerAgent.js';
import { ReviewCoordinator } from './agents/reviewCoordinator.js';

class NovelSettingServer {
  constructor() {
    this.server = new Server(
      {
        name: 'novel-setting-editor',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.settingManager = new SettingManager();
    this.routerAgent = new RouterAgent(this.settingManager);
    this.reviewCoordinator = new ReviewCoordinator(this.settingManager);

    this.setupHandlers();
  }

  setupHandlers() {
    // 列出可用的工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'propose_setting',
          description: '提议新的设定内容，生成设定草案',
          inputSchema: {
            type: 'object',
            properties: {
              request: {
                type: 'string',
                description: '你想添加的设定内容描述',
              },
              category: {
                type: 'string',
                description: '设定类别（如：势力、人物、功法、地理等）',
              },
            },
            required: ['request'],
          },
        },
        {
          name: 'review_setting',
          description: '审查设定草案，检测与现有设定的冲突',
          inputSchema: {
            type: 'object',
            properties: {
              draft: {
                type: 'string',
                description: '待审查的设定草案',
              },
            },
            required: ['draft'],
          },
        },
        {
          name: 'commit_setting',
          description: '将审查通过的设定写入对应的 Markdown 文件',
          inputSchema: {
            type: 'object',
            properties: {
              draft: {
                type: 'string',
                description: '已审查通过的设定内容',
              },
              targetFiles: {
                type: 'array',
                items: { type: 'string' },
                description: '需要更新的目标文件列表',
              },
            },
            required: ['draft', 'targetFiles'],
          },
        },
        {
          name: 'list_settings',
          description: '列出所有可用的设定文件',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    // 列出可用的资源（设定文件）
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const files = await this.settingManager.listSettingFiles();
      return {
        resources: files.map(file => ({
          uri: `setting:///${file}`,
          name: file,
          mimeType: 'text/markdown',
          description: `小说设定文件: ${file}`,
        })),
      };
    });

    // 读取资源内容
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const fileName = request.params.uri.replace('setting:///', '');
      const content = await this.settingManager.readSettingFile(fileName);
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'propose_setting': {
            const draft = await this.routerAgent.generateDraft(
              args.request,
              args.category
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ draft }, null, 2),
                },
              ],
            };
          }

          case 'review_setting': {
            const review = await this.reviewCoordinator.reviewDraft(args.draft);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(review, null, 2),
                },
              ],
            };
          }

          case 'commit_setting': {
            const result = await this.settingManager.commitSetting(
              args.draft,
              args.targetFiles
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'list_settings': {
            const files = await this.settingManager.listSettingFiles();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ files }, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: error.message }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Novel Setting MCP Server running on stdio');
  }
}

const server = new NovelSettingServer();
server.run().catch(console.error);
