import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  loadTemplate,
  replaceTemplateVars,
  TemplateType,
} from "../templates/index.js";

const execAsync = promisify(exec);

interface CommitTaskArgs {
  workspaceRoot: string;
  cycleNumber: string;
  message: string;
  body?: string;
}

interface PushBranchArgs {
  workspaceRoot: string;
}

interface CreatePRArgs {
  workspaceRoot: string;
  cycleNumber: string;
  taskNumber: string;
  taskTitle: string;
  changes: string[];
  acceptanceCriteria: string[];
  notes?: string;
}

export async function commitTask(args: CommitTaskArgs): Promise<string> {
  const { workspaceRoot, cycleNumber, message, body } = args;

  try {
    // Validate workflow is initialized
    const { validateWorkflowInitialized } = await import("../config.js");
    const validation = await validateWorkflowInitialized(workspaceRoot);
    if (!validation.valid) {
      return `❌ Workflow not properly initialized. Missing files:
${validation.missing.map((f) => `  - ${f}`).join("\n")}

Please run init-workflow first to set up the complete workflow structure.`;
    }

    // Stage all changes
    await execAsync("git add .", { cwd: workspaceRoot });

    // Create commit message
    const commitMessage = body
      ? `feat(cycle-${cycleNumber}): ${message}\n\n${body}`
      : `feat(cycle-${cycleNumber}): ${message}`;

    // Commit
    await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
      cwd: workspaceRoot,
    });

    return `✅ Changes committed successfully!

Commit: feat(cycle-${cycleNumber}): ${message}

Next steps:
- Continue working and commit incrementally, or
- Use push-branch to push your changes`;
  } catch (error) {
    if (error instanceof Error) {
      return `❌ Commit failed: ${error.message}`;
    }
    return "❌ Commit failed with unknown error";
  }
}

export async function pushBranch(args: PushBranchArgs): Promise<string> {
  const { workspaceRoot } = args;

  try {
    // Get current branch
    const { stdout: branch } = await execAsync(
      "git rev-parse --abbrev-ref HEAD",
      {
        cwd: workspaceRoot,
      },
    );
    const branchName = branch.trim();

    if (branchName === "main" || branchName === "master") {
      return "❌ Cannot push directly to main/master branch. Create a feature branch first.";
    }

    // Push branch
    await execAsync(`git push -u origin ${branchName}`, { cwd: workspaceRoot });

    return `✅ Branch pushed successfully!

Branch: ${branchName}

Next steps:
- Use create-pr to create a pull request`;
  } catch (error) {
    if (error instanceof Error) {
      return `❌ Push failed: ${error.message}`;
    }
    return "❌ Push failed with unknown error";
  }
}

export async function createPR(args: CreatePRArgs): Promise<string> {
  const {
    workspaceRoot,
    cycleNumber,
    taskNumber,
    taskTitle,
    changes,
    acceptanceCriteria,
    notes,
  } = args;

  try {
    // Validate workflow is initialized
    const { validateWorkflowInitialized } = await import("../config.js");
    const validation = await validateWorkflowInitialized(workspaceRoot);
    if (!validation.valid) {
      return `❌ Workflow not properly initialized. Missing files:
${validation.missing.map((f) => `  - ${f}`).join("\n")}

Please run init-workflow first to set up the complete workflow structure.`;
    }

    // Get current branch
    const { stdout: branch } = await execAsync(
      "git rev-parse --abbrev-ref HEAD",
      {
        cwd: workspaceRoot,
      },
    );
    const branchName = branch.trim();

    // Load PR template
    const template = await loadTemplate(TemplateType.PR);

    // Format changes
    const changesText = changes.map((c) => `- ${c}`).join("\n");

    // Format acceptance criteria
    const acceptanceCriteriaText = acceptanceCriteria
      .map((c) => `- [ ] ${c}`)
      .join("\n");

    const prBody = replaceTemplateVars(template, {
      TASK_NUMBER: taskNumber,
      CYCLE_NUMBER: cycleNumber,
      TASK_TITLE: taskTitle,
      ACCEPTANCE_CRITERIA_CHECKLIST: acceptanceCriteriaText,
    });

    // Replace the Changes section
    const prBodyWithChanges = prBody.replace(
      /## Changes\n\n- \n- \n- /,
      `## Changes\n\n${changesText}`,
    );

    // Add notes if provided
    const finalPRBody = notes
      ? prBodyWithChanges.replace(
          /_Any deviations, challenges encountered, or future improvements_/,
          notes,
        )
      : prBodyWithChanges;

    // Create PR using GitHub CLI if available
    try {
      const prTitle = `feat(cycle-${cycleNumber}): ${taskTitle}`;

      // Try to create PR with gh CLI
      await execAsync(
        `gh pr create --title "${prTitle}" --body "${finalPRBody.replace(
          /"/g,
          '\\"',
        )}" --base main`,
        { cwd: workspaceRoot },
      );

      // Mark task as complete in cycle README
      await markTaskComplete(workspaceRoot, cycleNumber, taskNumber);

      return `✅ Pull Request created successfully!

Title: feat(cycle-${cycleNumber}): ${taskTitle}
Branch: ${branchName}

Task ${taskNumber} has been marked as complete in the cycle README.

Next steps:
1. Review the PR on GitHub
2. Wait for CI/CD checks to pass
3. Merge the PR when ready
4. Start the next task`;
    } catch (_ghError) {
      // If gh CLI fails, provide manual instructions
      return `⚠️ GitHub CLI not available. Please create the PR manually:

Title: feat(cycle-${cycleNumber}): ${taskTitle}
Branch: ${branchName}
Base: main

PR Body:
${finalPRBody}

After creating the PR, the task will be marked as complete automatically.`;
    }
  } catch (error) {
    if (error instanceof Error) {
      return `❌ PR creation failed: ${error.message}`;
    }
    return "❌ PR creation failed with unknown error";
  }
}

async function markTaskComplete(
  workspaceRoot: string,
  cycleNumber: string,
  taskNumber: string,
): Promise<void> {
  try {
    // Find cycle directory
    const cyclesDir = join(workspaceRoot, "docs", "cycles");
    const { stdout: cycleDirs } = await execAsync(`ls ${cyclesDir}`);
    const cycleDir = cycleDirs
      .split("\n")
      .find((dir) => dir.startsWith(`${cycleNumber}-`));

    if (!cycleDir) return;

    const readmePath = join(cyclesDir, cycleDir, "README.md");
    let content = await readFile(readmePath, "utf-8");

    // Mark task as complete
    const taskPattern = new RegExp(`- \\[ \\] \\*\\*\\[${taskNumber}\\]`, "g");
    content = content.replace(taskPattern, `- [x] **[${taskNumber}]`);

    // Update progress
    const taskMatches = content.match(/- \[[x ]\]/g);
    if (taskMatches) {
      const total = taskMatches.length;
      const completed = taskMatches.filter((m) => m === "- [x]").length;
      const percentage = Math.round((completed / total) * 100);
      const filled = Math.round((completed / total) * 20);
      const empty = 20 - filled;
      const bar = "█".repeat(filled) + "░".repeat(empty);

      content = content.replace(
        /\*\*Completed\*\*: \d+\/\d+ tasks \(\d+%\)/,
        `**Completed**: ${completed}/${total} tasks (${percentage}%)`,
      );
      content = content.replace(/\[.*?\] \d+%/, `[${bar}] ${percentage}%`);
    }

    // Write updated content
    const { writeFile } = await import("node:fs/promises");
    await writeFile(readmePath, content);
  } catch (error) {
    // Silently fail - this is a nice-to-have
    console.error("Failed to mark task complete:", error);
  }
}
