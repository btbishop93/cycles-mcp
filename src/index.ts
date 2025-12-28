#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadTemplate, TemplateType } from "./templates/index.js";
import { addTask } from "./tools/add-task.js";
import { createCycle } from "./tools/create-cycle.js";
import { commitTask, createPR, pushBranch } from "./tools/git-workflow.js";
import { initWorkflow } from "./tools/init-workflow.js";
import { updateProgress } from "./tools/update-progress.js";

const server = new Server(
  {
    name: "cycles-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "init-workflow",
        description:
          "Initialize the cycle-based workflow in a repository. Creates docs structure, WORKFLOW.md, cycles.md, and configuration file. IMPORTANT: You MUST prompt the user for sizing_mode, cycle_duration_unit, cycle_duration_value, and hours_per_cycle before calling this tool. Do NOT use defaults without asking the user first.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceRoot: {
              type: "string",
              description: "Absolute path to the workspace root directory",
            },
            projectName: {
              type: "string",
              description: "Name of the project (optional)",
            },
            sizing_mode: {
              type: "string",
              enum: ["simple", "granular"],
              description:
                "Task sizing mode: simple (pick tier) or granular (specify all options). REQUIRED: Ask user to choose.",
            },
            simple_tier: {
              type: "string",
              enum: ["junior", "mid", "senior"],
              description:
                "Tier for simple mode (junior: 1h tasks with high detail, mid: 2h with medium detail, senior: 4h with low detail). REQUIRED if sizing_mode is 'simple'.",
            },
            difficulty: {
              type: "string",
              enum: ["junior", "mid", "senior"],
              description:
                "Difficulty level for granular mode. REQUIRED if sizing_mode is 'granular'.",
            },
            task_duration: {
              type: "string",
              enum: ["0.5h", "1h", "2h", "4h", "8h"],
              description:
                "Task duration for granular mode. REQUIRED if sizing_mode is 'granular'.",
            },
            detail_level: {
              type: "string",
              enum: ["high", "medium", "low"],
              description:
                "Detail level for granular mode (high: step-by-step, medium: balanced, low: high-level). REQUIRED if sizing_mode is 'granular'.",
            },
            cycle_duration_unit: {
              type: "string",
              enum: ["weeks", "months", "quarters"],
              description:
                "Cycle duration unit. REQUIRED: Ask user how long each cycle should be.",
            },
            cycle_duration_value: {
              type: "number",
              description:
                "Cycle duration value (1-3 for weeks, 1-2 for months, 1 for quarters). REQUIRED: Ask user for the specific value.",
            },
            hours_per_cycle: {
              type: "number",
              description:
                "Total hours available per cycle. REQUIRED: Ask user how many hours they have available per cycle.",
            },
          },
          required: ["workspaceRoot"],
        },
      },
      {
        name: "create-cycle",
        description:
          "Create a new development cycle with README and structure.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceRoot: {
              type: "string",
              description: "Absolute path to the workspace root directory",
            },
            cycleName: {
              type: "string",
              description: 'Name of the cycle (e.g., "Authentication System")',
            },
            cycleDescription: {
              type: "string",
              description:
                "Description of what this cycle accomplishes (optional)",
            },
            cycleGoal: {
              type: "string",
              description: "Main goal of the cycle (optional)",
            },
            successCriteria: {
              type: "string",
              description: "Success criteria as markdown list (optional)",
            },
            deliverables: {
              type: "string",
              description: "Deliverables as markdown list (optional)",
            },
          },
          required: ["workspaceRoot", "cycleName"],
        },
      },
      {
        name: "add-task",
        description:
          "Add a new task to an existing cycle. Automatically updates task dependencies section to show which tasks can be done in parallel.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceRoot: {
              type: "string",
              description: "Absolute path to the workspace root directory",
            },
            cycleNumber: {
              type: "string",
              description: 'Cycle number (e.g., "01")',
            },
            taskTitle: {
              type: "string",
              description: "Title of the task",
            },
            taskOverview: {
              type: "string",
              description: "Overview of what the task accomplishes (optional)",
            },
            taskSteps: {
              type: "string",
              description: "Step-by-step instructions as markdown (optional)",
            },
            acceptanceCriteria: {
              type: "string",
              description:
                "Acceptance criteria as markdown checklist (optional)",
            },
            testingInstructions: {
              type: "string",
              description: "Testing instructions as markdown (optional)",
            },
            tips: {
              type: "string",
              description: "Tips for completing the task (optional)",
            },
            troubleshooting: {
              type: "string",
              description: "Common troubleshooting steps (optional)",
            },
            nextSteps: {
              type: "string",
              description: "What happens after this task (optional)",
            },
            prerequisites: {
              type: "string",
              description: "Prerequisites for this task (optional)",
            },
            dependencies: {
              type: "string",
              description:
                'Task dependencies (e.g., "Task 001, Task 002" or "None"). Used to determine parallel execution groups.',
            },
            conflicts: {
              type: "string",
              description:
                'Potential conflicts with other tasks (e.g., "Task 003 (both modify auth module)" or "None").',
            },
            modifiedAreas: {
              type: "string",
              description:
                'Files/areas this task modifies (e.g., "src/auth/, database schema"). Helps identify merge conflicts.',
            },
            difficulty: {
              type: "string",
              enum: ["junior", "mid", "senior"],
              description:
                "Override difficulty level for this specific task (optional)",
            },
            duration: {
              type: "string",
              enum: ["0.5h", "1h", "2h", "4h", "8h"],
              description:
                "Override duration for this specific task (optional)",
            },
            detailLevel: {
              type: "string",
              enum: ["high", "medium", "low"],
              description:
                "Override detail level for this specific task (optional)",
            },
          },
          required: ["workspaceRoot", "cycleNumber", "taskTitle"],
        },
      },
      {
        name: "commit-task",
        description:
          "Commit changes for a task with conventional commit message.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceRoot: {
              type: "string",
              description: "Absolute path to the workspace root directory",
            },
            cycleNumber: {
              type: "string",
              description: 'Cycle number (e.g., "01")',
            },
            message: {
              type: "string",
              description:
                "Commit message description (without the type/scope prefix)",
            },
            body: {
              type: "string",
              description: "Optional commit body with detailed changes",
            },
          },
          required: ["workspaceRoot", "cycleNumber", "message"],
        },
      },
      {
        name: "push-branch",
        description: "Push the current branch to origin.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceRoot: {
              type: "string",
              description: "Absolute path to the workspace root directory",
            },
          },
          required: ["workspaceRoot"],
        },
      },
      {
        name: "create-pr",
        description:
          "Create a pull request for the current task. Automatically marks task as complete.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceRoot: {
              type: "string",
              description: "Absolute path to the workspace root directory",
            },
            cycleNumber: {
              type: "string",
              description: 'Cycle number (e.g., "01")',
            },
            taskNumber: {
              type: "string",
              description: 'Task number (e.g., "001")',
            },
            taskTitle: {
              type: "string",
              description: "Title of the task",
            },
            changes: {
              type: "array",
              items: { type: "string" },
              description: "List of changes made",
            },
            acceptanceCriteria: {
              type: "array",
              items: { type: "string" },
              description: "Acceptance criteria from the task",
            },
            notes: {
              type: "string",
              description:
                "Additional notes, challenges, or future improvements (optional)",
            },
          },
          required: [
            "workspaceRoot",
            "cycleNumber",
            "taskNumber",
            "taskTitle",
            "changes",
            "acceptanceCriteria",
          ],
        },
      },
      {
        name: "update-progress",
        description:
          "Update cycle progress, mark tasks complete, and log sessions.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceRoot: {
              type: "string",
              description: "Absolute path to the workspace root directory",
            },
            cycleNumber: {
              type: "string",
              description: 'Cycle number (e.g., "01")',
            },
            taskNumber: {
              type: "string",
              description: "Task number to mark complete (optional)",
            },
            sessionDate: {
              type: "string",
              description: "Session date in YYYY-MM-DD format (optional)",
            },
            sessionDuration: {
              type: "string",
              description: 'Session duration (e.g., "2h", "1.5h") (optional)',
            },
            sessionNotes: {
              type: "string",
              description: "Notes about the session (optional)",
            },
          },
          required: ["workspaceRoot", "cycleNumber"],
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
      case "init-workflow":
        return {
          content: [{ type: "text", text: await initWorkflow(args as any) }],
        };

      case "create-cycle":
        return {
          content: [{ type: "text", text: await createCycle(args as any) }],
        };

      case "add-task":
        return {
          content: [{ type: "text", text: await addTask(args as any) }],
        };

      case "commit-task":
        return {
          content: [{ type: "text", text: await commitTask(args as any) }],
        };

      case "push-branch":
        return {
          content: [{ type: "text", text: await pushBranch(args as any) }],
        };

      case "create-pr":
        return {
          content: [{ type: "text", text: await createPR(args as any) }],
        };

      case "update-progress":
        return {
          content: [{ type: "text", text: await updateProgress(args as any) }],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
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
        uri: "template://workflow",
        name: "WORKFLOW.md Template",
        mimeType: "text/markdown",
        description: "Complete workflow guide template",
      },
      {
        uri: "template://cycles",
        name: "cycles.md Template",
        mimeType: "text/markdown",
        description: "Cycles tracker template",
      },
      {
        uri: "template://cycle-readme",
        name: "Cycle README Template",
        mimeType: "text/markdown",
        description: "Individual cycle README template",
      },
      {
        uri: "template://task",
        name: "Task Template",
        mimeType: "text/markdown",
        description: "Task file template",
      },
      {
        uri: "template://pr",
        name: "PR Template",
        mimeType: "text/markdown",
        description: "Pull request template",
      },
    ],
  };
});

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const templateMap: Record<string, TemplateType> = {
    "template://workflow": TemplateType.WORKFLOW,
    "template://cycles": TemplateType.CYCLES,
    "template://cycle-readme": TemplateType.CYCLE_README,
    "template://task": TemplateType.TASK,
    "template://pr": TemplateType.PR,
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
        mimeType: "text/markdown",
        text: content,
      },
    ],
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cycles MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
