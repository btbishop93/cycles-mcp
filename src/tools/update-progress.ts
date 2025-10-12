import { readFile, writeFile, readdir } from "fs/promises";
import { join } from "path";
import { generateProgressBar } from "../templates/index.js";

interface UpdateProgressArgs {
  workspaceRoot: string;
  cycleNumber: string;
  taskNumber?: string;
  sessionDate?: string;
  sessionDuration?: string;
  sessionNotes?: string;
}

export async function updateProgress(
  args: UpdateProgressArgs
): Promise<string> {
  const {
    workspaceRoot,
    cycleNumber,
    taskNumber,
    sessionDate,
    sessionDuration,
    sessionNotes,
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

    // Find cycle directory
    const cyclesDir = join(workspaceRoot, "docs", "cycles");
    const cycleDirs = await readdir(cyclesDir);
    const cycleDir = cycleDirs.find((dir) => dir.startsWith(`${cycleNumber}-`));

    if (!cycleDir) {
      return `❌ Cycle ${cycleNumber} not found.`;
    }

    const readmePath = join(cyclesDir, cycleDir, "README.md");
    let content = await readFile(readmePath, "utf-8");

    // Mark task as complete if specified
    if (taskNumber) {
      const taskPattern = new RegExp(
        `- \\[ \\] \\*\\*\\[${taskNumber}\\]`,
        "g"
      );
      if (content.match(taskPattern)) {
        content = content.replace(taskPattern, `- [x] **[${taskNumber}]`);
      } else {
        return `❌ Task ${taskNumber} not found or already completed.`;
      }
    }

    // Update progress bar
    const taskMatches = content.match(/- \[[x ]\]/g);
    if (taskMatches) {
      const total = taskMatches.length;
      const completed = taskMatches.filter((m) => m === "- [x]").length;
      const progressBar = generateProgressBar(completed, total);

      content = content.replace(
        /\*\*Completed\*\*: \d+\/\d+ tasks \(\d+%\)/,
        `**Completed**: ${completed}/${total} tasks (${Math.round(
          (completed / total) * 100
        )}%)`
      );
      content = content.replace(/\[.*?\] \d+%/, progressBar);
    }

    // Add session log entry if provided
    if (sessionDate && sessionDuration) {
      const sessionLogMarker = "### Session Log";
      const sessionLogIndex = content.indexOf(sessionLogMarker);

      if (sessionLogIndex !== -1) {
        // Find the table
        const tableHeaderIndex = content.indexOf("| Date", sessionLogIndex);
        const tableStart = content.indexOf("| ----", tableHeaderIndex);
        const nextSectionIndex = content.indexOf("\n## ", tableStart);

        if (tableStart !== -1) {
          // Check if there's a "Not started" row
          const notStartedPattern =
            /\| -    \| -        \| -               \| Not started \|/;
          if (notStartedPattern.test(content)) {
            // Replace "Not started" row
            content = content.replace(
              notStartedPattern,
              `| ${sessionDate} | ${sessionDuration} | ${taskNumber || "-"} | ${
                sessionNotes || "-"
              } |`
            );
          } else {
            // Add new row after divider
            const insertPosition = content.indexOf("\n", tableStart) + 1;
            const newRow = `| ${sessionDate} | ${sessionDuration} | ${
              taskNumber || "-"
            } | ${sessionNotes || "-"} |\n`;
            content =
              content.substring(0, insertPosition) +
              newRow +
              content.substring(insertPosition);
          }
        }
      }
    }

    // Write updated content
    await writeFile(readmePath, content);

    return `✅ Progress updated successfully!

${taskNumber ? `Task ${taskNumber} marked as complete.` : ""}
${sessionDate ? `Session logged: ${sessionDate} (${sessionDuration})` : ""}

Updated cycle README: docs/cycles/${cycleDir}/README.md`;
  } catch (error) {
    if (error instanceof Error) {
      return `❌ Failed to update progress: ${error.message}`;
    }
    return "❌ Failed to update progress with unknown error";
  }
}
