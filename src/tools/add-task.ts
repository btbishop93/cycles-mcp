import { writeFile, readFile, readdir } from "fs/promises";
import { join } from "path";
import { loadConfig } from "../config.js";
import {
  loadTemplate,
  replaceTemplateVars,
  padNumber,
  TemplateType,
} from "../templates/index.js";
import {
  simpleTierToGranular,
  parseDuration,
  DifficultyLevel,
  TaskDuration,
  DetailLevel,
} from "../types.js";

interface AddTaskArgs {
  workspaceRoot: string;
  cycleNumber: string; // e.g., "01"
  taskTitle: string;
  taskOverview?: string;
  taskSteps?: string;
  acceptanceCriteria?: string;
  testingInstructions?: string;
  tips?: string;
  troubleshooting?: string;
  nextSteps?: string;
  prerequisites?: string;
  // Optional overrides
  difficulty?: DifficultyLevel;
  duration?: TaskDuration;
  detailLevel?: DetailLevel;
}

export async function addTask(args: AddTaskArgs): Promise<string> {
  const { workspaceRoot, cycleNumber, taskTitle } = args;

  // Load config
  const config = await loadConfig(workspaceRoot);
  if (!config) {
    return "❌ Workflow not initialized. Run init-workflow first.";
  }

  // Find cycle directory
  const cyclesDir = join(workspaceRoot, "docs", "cycles");
  const cycleDirs = await readdir(cyclesDir).catch(() => []);
  const cycleDir = cycleDirs.find((dir) => dir.startsWith(`${cycleNumber}-`));

  if (!cycleDir) {
    return `❌ Cycle ${cycleNumber} not found. Create it first with create-cycle.`;
  }

  const cyclePath = join(cyclesDir, cycleDir);

  // Determine task settings
  let difficulty: DifficultyLevel;
  let taskDuration: TaskDuration;
  let detailLevel: DetailLevel;

  if (args.difficulty && args.duration && args.detailLevel) {
    // Use provided overrides
    difficulty = args.difficulty;
    taskDuration = args.duration;
    detailLevel = args.detailLevel;
  } else if (config.sizing_mode === "simple" && config.simple_tier) {
    // Use simple tier mapping
    const granular = simpleTierToGranular(config.simple_tier);
    difficulty = granular.difficulty;
    taskDuration = granular.duration;
    detailLevel = granular.detailLevel;
  } else if (
    config.sizing_mode === "granular" &&
    config.difficulty &&
    config.task_duration &&
    config.detail_level
  ) {
    // Use granular settings
    difficulty = config.difficulty;
    taskDuration = config.task_duration;
    detailLevel = config.detail_level;
  } else {
    return "❌ Invalid configuration. Please run init-workflow again.";
  }

  // Determine next task number
  const existingFiles = await readdir(cyclePath);
  const taskFiles = existingFiles.filter((f) => /^\d{3}-.*\.md$/.test(f));
  const taskNumbers = taskFiles
    .map((f) => parseInt(f.substring(0, 3)))
    .filter((n) => !isNaN(n));
  const nextTaskNum = taskNumbers.length > 0 ? Math.max(...taskNumbers) + 1 : 1;
  const taskNumber = padNumber(nextTaskNum, 3);

  // Create task file
  const template = await loadTemplate(TemplateType.TASK);

  // Adjust content based on detail level
  const getDetailedContent = (
    provided: string | undefined,
    defaultContent: string,
    detailLevel: DetailLevel
  ): string => {
    if (provided) return provided;

    if (detailLevel === "high") {
      return (
        defaultContent +
        "\n\n_Detailed step-by-step instructions will guide you through this task._"
      );
    } else if (detailLevel === "medium") {
      return defaultContent;
    } else {
      return "_High-level objective defined. Implementation details left to your expertise._";
    }
  };

  const taskContent = replaceTemplateVars(template, {
    TASK_NUMBER: taskNumber,
    TASK_TITLE: taskTitle,
    TASK_DURATION: taskDuration,
    DIFFICULTY: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
    PREREQUISITES: args.prerequisites || "Basic development environment setup",
    TASK_OVERVIEW:
      args.taskOverview || `This task focuses on ${taskTitle.toLowerCase()}.`,
    TASK_STEPS: getDetailedContent(
      args.taskSteps,
      "1. Review the requirements\n2. Implement the solution\n3. Test your implementation",
      detailLevel
    ),
    ACCEPTANCE_CRITERIA:
      args.acceptanceCriteria ||
      `- [ ] ${taskTitle} is implemented\n- [ ] Tests pass\n- [ ] Code is documented`,
    TESTING_INSTRUCTIONS:
      args.testingInstructions ||
      "1. Run the application\n2. Verify functionality\n3. Check for errors",
    TIPS:
      args.tips ||
      "- Break down complex problems into smaller steps\n- Test incrementally\n- Commit your work frequently",
    TROUBLESHOOTING:
      args.troubleshooting ||
      "_Common issues and solutions will be documented here as they arise._",
    NEXT_STEPS: args.nextSteps || "continue building on this foundation",
  });

  const taskFileName = `${taskNumber}-${taskTitle
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")}.md`;
  const taskFilePath = join(cyclePath, taskFileName);
  await writeFile(taskFilePath, taskContent);

  // Update cycle README with new task
  await updateCycleReadmeWithTask(
    cyclePath,
    taskNumber,
    taskTitle,
    taskFileName,
    parseDuration(taskDuration)
  );

  return `✅ Task ${taskNumber} created successfully!

Created:
- ${cycleDir}/${taskFileName}

Configuration:
- Difficulty: ${difficulty}
- Duration: ${taskDuration}
- Detail Level: ${detailLevel}

Updated cycle README with task entry.

Next steps:
1. Review the task file: docs/cycles/${cycleDir}/${taskFileName}
2. Create a feature branch: feat/cycle-${cycleNumber}-task-${taskNumber}-description
3. Follow the workflow in WORKFLOW.md`;
}

async function updateCycleReadmeWithTask(
  cyclePath: string,
  taskNumber: string,
  taskTitle: string,
  taskFileName: string,
  duration: number
): Promise<void> {
  const readmePath = join(cyclePath, "README.md");
  let content = await readFile(readmePath, "utf-8");

  // Find and update task list
  const taskListMarker = "## Tasks (";
  const taskListIndex = content.indexOf(taskListMarker);

  if (taskListIndex !== -1) {
    // Update task count
    const taskCountMatch = content.match(/## Tasks \((\d+) total\)/);
    const currentCount = taskCountMatch ? parseInt(taskCountMatch[1]) : 0;
    const newCount = currentCount + 1;
    content = content.replace(
      /## Tasks \(\d+ total\)/,
      `## Tasks (${newCount} total)`
    );

    // Find where to insert the new task
    const progressTrackerIndex = content.indexOf("## Progress Tracker");
    const taskListSection = content.substring(
      taskListIndex,
      progressTrackerIndex
    );

    // Check if there's already task content
    if (taskListSection.includes("_No tasks yet")) {
      // Replace the placeholder
      content = content.replace(
        /_No tasks yet\. Use add-task to create tasks\._/,
        `- [ ] **[${taskNumber}](./${taskFileName})** - ${taskTitle} (${duration}h)`
      );
    } else {
      // Add to existing list
      const insertPosition = progressTrackerIndex;
      const newTask = `- [ ] **[${taskNumber}](./${taskFileName})** - ${taskTitle} (${duration}h)\n\n`;
      content =
        content.substring(0, insertPosition) +
        newTask +
        content.substring(insertPosition);
    }

    // Update estimated hours
    const estimatedHoursMatch = content.match(
      /\*\*Estimated Hours\*\*: (\d+(?:\.\d+)?) hours/
    );
    if (estimatedHoursMatch) {
      const currentHours = parseFloat(estimatedHoursMatch[1]);
      const newHours = currentHours + duration;
      content = content.replace(
        /\*\*Estimated Hours\*\*: \d+(?:\.\d+)? hours/,
        `**Estimated Hours**: ${newHours} hours`
      );
    }

    // Update task count in progress tracker
    content = content.replace(
      /\*\*Completed\*\*: \d+\/\d+ tasks/,
      `**Completed**: 0/${newCount} tasks`
    );

    await writeFile(readmePath, content);
  }
}
