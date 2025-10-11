#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { initWorkflow } from './tools/init-workflow.js';
import { createCycle } from './tools/create-cycle.js';
import { addTask } from './tools/add-task.js';
import { commitTask, pushBranch, createPR } from './tools/git-workflow.js';
import { updateProgress } from './tools/update-progress.js';
import { loadTemplate, TemplateType } from './templates/index.js';

const server = new Server(
  {
    name: 'cycles-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'init-workflow',
        description:
          'Initialize the cycle-based workflow in a repository. Creates docs structure, WORKFLOW.md, cycles.md, and configuration file.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceRoot: {
              type: 'string',
              description: 'Absolute path to the workspace root directory',
            },
            projectName: {
              type: 'string',
              description: 'Name of the project (optional)',
            },
            sizing_mode: {
              type: 'string',
              enum: ['simple', 'granular'],
              description: 'Task sizing mode: simple (pick tier) or granular (specify all options)',
            },
            simple_tier: {
              type: 'string',
              enum: ['junior', 'mid', 'senior'],
              description: 'Tier for simple mode (junior: 1h tasks with high detail, mid: 2h with medium detail, senior: 4h with low detail)',
            },
            difficulty: {
              type: 'string',
              enum: ['junior', 'mid', 'senior'],
              description: 'Difficulty level for granular mode',
            },
            task_duration: {
              type: 'string',
              enum: ['0.5h', '1h', '2h', '4h', '8h'],
              description: 'Task duration for granular mode',
            },
            detail_level: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Detail level for granular mode (high: step-by-step, medium: balanced, low: high-level)',
            },
            cycle_duration_unit: {
              type: 'string',
              enum: ['weeks', 'months', 'quarters'],
              description: 'Cycle duration unit',
            },
            cycle_duration_value: {
              type: 'number',
              description: 'Cycle duration value (1-3 for weeks, 1-2 for months, 1 for quarters)',
            },
            hours_per_cycle: {
              type: 'number',
              description: 'Total hours available per cycle',
            },
          },
          required: ['workspaceRoot'],
        },
      },
      {
        name: 'create-cycle',
        description: 'Create a new development cycle with README and structure.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceRoot: {
              type: 'string',
              description: 'Absolute path to the workspace root directory',
            },
            cycleName: {
              type: 'string',
              description: 'Name of the cycle (e.g., "Authentication System")',
            },
            cycleDescription: {
              type: 'string',
              description: 'Description of what this cycle accomplishes (optional)',
            },
            cycleGoal: {
              type: 'string',
              description: 'Main goal of the cycle (optional)',
            },
            successCriteria: {
              type: 'string',
              description: 'Success criteria as markdown list (optional)',
            },
            deliverables: {
              type: 'string',
              description: 'Deliverables as markdown list (optional)',
            },
          },
          required: ['workspaceRoot', 'cycleName'],
        },
      },
      {
        name: 'add-task',
        description: 'Add a new task to an existing cycle.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceRoot: {
              type: 'string',
              description: 'Absolute path to the workspace root directory',
            },
            cycleNumber: {
              type: 'string',
              description: 'Cycle number (e.g., "01")',
            },
            taskTitle: {
              type: 'string',
              description: 'Title of the task',
            },
            taskOverview: {
              type: 'string',
              description: 'Overview of what the task accomplishes (optional)',
            },
            taskSteps: {
              type: 'string',
              description: 'Step-by-step instructions as markdown (optional)',
            },
            acceptanceCriteria: {
              type: 'string',
              description: 'Acceptance criteria as markdown checklist (optional)',
            },
            testingInstructions: {
              type: 'string',
              description: 'Testing instructions as markdown (optional)',
            },
            tips: {
              type: 'string',
              description: 'Tips for completing the task (optional)',
            },
            troubleshooting: {
              type: 'string',
              description: 'Common troubleshooting steps (optional)',
            },
            nextSteps: {
              type: 'string',
              description: 'What happens after this task (optional)',
            },
            prerequisites: {
              type: 'string',
              description: 'Prerequisites for this task (optional)',
            },
            difficulty: {
              type: 'string',
              enum: ['junior', 'mid', 'senior'],
              description: 'Override difficulty level for this specific task (optional)',
            },
            duration: {
              type: 'string',
              enum: ['0.5h', '1h', '2h', '4h', '8h'],
              description: 'Override duration for this specific task (optional)',
            },
            detailLevel: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Override detail level for this specific task (optional)',
            },
          },
          required: ['workspaceRoot', 'cycleNumber', 'taskTitle'],
        },
      },
      {
        name: 'commit-task',
        description: 'Commit changes for a task with conventional commit message.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceRoot: {
              type: 'string',
              description: 'Absolute path to the workspace root directory',
            },
            cycleNumber: {
              type: 'string',
              description: 'Cycle number (e.g., "01")',
            },
            message: {
              type: 'string',
              description: 'Commit message description (without the type/scope prefix)',
            },
            body: {
              type: 'string',
              description: 'Optional commit body with detailed changes',
            },
          },
          required: ['workspaceRoot', 'cycleNumber', 'message'],
        },
      },
      {
        name: 'push-branch',
        description: 'Push the current branch to origin.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceRoot: {
              type: 'string',
              description: 'Absolute path to the workspace root directory',
            },
          },
          required: ['workspaceRoot'],
        },
      },
      {
        name: 'create-pr',
        description: 'Create a pull request for the current task. Automatically marks task as complete.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceRoot: {
              type: 'string',
              description: 'Absolute path to the workspace root directory',
            },
            cycleNumber: {
              type: 'string',
              description: 'Cycle number (e.g., "01")',
            },
            taskNumber: {
              type: 'string',
              description: 'Task number (e.g., "001")',
            },
            taskTitle: {
              type: 'string',
              description: 'Title of the task',
            },
            changes: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of changes made',
            },
            acceptanceCriteria: {
              type: 'array',
              items: { type: 'string' },
              description: 'Acceptance criteria from the task',
            },
            notes: {
              type: 'string',
              description: 'Additional notes, challenges, or future improvements (optional)',
            },
          },
          required: [
            'workspaceRoot',
            'cycleNumber',
            'taskNumber',
            'taskTitle',
            'changes',
            'acceptanceCriteria',
          ],
        },
      },
      {
        name: 'update-progress',
        description: 'Update cycle progress, mark tasks complete, and log sessions.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceRoot: {
              type: 'string',
              description: 'Absolute path to the workspace root directory',
            },
            cycleNumber: {
              type: 'string',
              description: 'Cycle number (e.g., "01")',
            },
            taskNumber: {
              type: 'string',
              description: 'Task number to mark complete (optional)',
            },
            sessionDate: {
              type: 'string',
              description: 'Session date in YYYY-MM-DD format (optional)',
            },
            sessionDuration: {
              type: 'string',
              description: 'Session duration (e.g., "2h", "1.5h") (optional)',
            },
            sessionNotes: {
              type: 'string',
              description: 'Notes about the session (optional)',
            },
          },
          required: ['workspaceRoot', 'cycleNumber'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'init-workflow':
        return {
          content: [{ type: 'text', text: await initWorkflow(args as any) }],
        };

      case 'create-cycle':
        return {
          content: [{ type: 'text', text: await createCycle(args as any) }],
        };

      case 'add-task':
        return {
          content: [{ type: 'text', text: await addTask(args as any) }],
        };

      case 'commit-task':
        return {
          content: [{ type: 'text', text: await commitTask(args as any) }],
        };

      case 'push-branch':
        return {
          content: [{ type: 'text', text: await pushBranch(args as any) }],
        };

      case 'create-pr':
        return {
          content: [{ type: 'text', text: await createPR(args as any) }],
        };

      case 'update-progress':
        return {
          content: [{ type: 'text', text: await updateProgress(args as any) }],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      };
    }
    throw error;
  }
});

// List resources (templates)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'template://workflow',
        name: 'WORKFLOW.md Template',
        mimeType: 'text/markdown',
        description: 'Complete workflow guide template',
      },
      {
        uri: 'template://cycles',
        name: 'cycles.md Template',
        mimeType: 'text/markdown',
        description: 'Cycles tracker template',
      },
      {
        uri: 'template://cycle-readme',
        name: 'Cycle README Template',
        mimeType: 'text/markdown',
        description: 'Individual cycle README template',
      },
      {
        uri: 'template://task',
        name: 'Task Template',
        mimeType: 'text/markdown',
        description: 'Task file template',
      },
      {
        uri: 'template://pr',
        name: 'PR Template',
        mimeType: 'text/markdown',
        description: 'Pull request template',
      },
    ],
  };
});

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const templateMap: Record<string, TemplateType> = {
    'template://workflow': TemplateType.WORKFLOW,
    'template://cycles': TemplateType.CYCLES,
    'template://cycle-readme': TemplateType.CYCLE_README,
    'template://task': TemplateType.TASK,
    'template://pr': TemplateType.PR,
  };

  const templateType = templateMap[uri];
  if (!templateType) {
    throw new Error(`Unknown resource: ${uri}`);
  }

  const content = await loadTemplate(templateType);
  return {
    contents: [
      {
        uri,
        mimeType: 'text/markdown',
        text: content,
      },
    ],
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cycles MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

