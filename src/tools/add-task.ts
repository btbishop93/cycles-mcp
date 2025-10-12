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
  // Dependency tracking
  dependencies?: string; // e.g., "Task 001, Task 002" or "None"
  conflicts?: string; // e.g., "Task 003 (both modify auth)" or "None"
  modifiedAreas?: string; // e.g., "src/auth/, database schema"
  // Optional overrides
  difficulty?: DifficultyLevel;
  duration?: TaskDuration;
  detailLevel?: DetailLevel;
}

export async function addTask(args: AddTaskArgs): Promise<string> {
  const { workspaceRoot, cycleNumber, taskTitle } = args;

  // Validate workflow is initialized
  const { validateWorkflowInitialized } = await import("../config.js");
  const validation = await validateWorkflowInitialized(workspaceRoot);
  if (!validation.valid) {
    return `❌ Workflow not properly initialized. Missing files:
${validation.missing.map((f) => `  - ${f}`).join("\n")}

Please run init-workflow first to set up the complete workflow structure.`;
  }

  // Load config
  const config = await loadConfig(workspaceRoot);
  if (!config) {
    return "❌ Configuration file is invalid or corrupt. Please run init-workflow again.";
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

  // Determine parallelization status
  const dependencies = args.dependencies || "None (can start immediately)";
  const conflicts = args.conflicts || "None";
  const hasDependencies = dependencies !== "None (can start immediately)";
  const hasConflicts = conflicts !== "None";

  let parallelizationStatus: string;
  if (!hasDependencies && !hasConflicts) {
    parallelizationStatus = "✅ Safe to run in parallel with other tasks";
  } else if (hasDependencies && !hasConflicts) {
    parallelizationStatus =
      "⏳ Must wait for dependencies, but can run in parallel with tasks in same group";
  } else if (!hasDependencies && hasConflicts) {
    parallelizationStatus =
      "⚠️ Can start immediately but may conflict during merge";
  } else {
    parallelizationStatus =
      "⚠️ Must wait for dependencies and may conflict during merge";
  }

  const taskContent = replaceTemplateVars(template, {
    TASK_NUMBER: taskNumber,
    TASK_TITLE: taskTitle,
    TASK_DURATION: taskDuration,
    DIFFICULTY: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
    DEPENDENCIES: dependencies,
    CONFLICTS: conflicts,
    PARALLELIZATION_STATUS: parallelizationStatus,
    MODIFIED_AREAS:
      args.modifiedAreas ||
      "_To be determined during implementation. Update this section as you work._",
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
    parseDuration(taskDuration),
    dependencies
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
  duration: number,
  dependencies: string
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

    // Regenerate task dependencies section
    await regenerateTaskDependencies(cyclePath, content, readmePath);
  }
}

async function regenerateTaskDependencies(
  cyclePath: string,
  content: string,
  readmePath: string
): Promise<void> {
  // Read all task files to extract dependencies
  const taskFiles = await readdir(cyclePath);
  const taskMdFiles = taskFiles.filter((f) => /^\d{3}-.*\.md$/.test(f)).sort();

  interface TaskInfo {
    number: string;
    title: string;
    dependencies: string[];
    fileName: string;
  }

  const tasks: TaskInfo[] = [];

  for (const file of taskMdFiles) {
    const taskPath = join(cyclePath, file);
    const taskContent = await readFile(taskPath, "utf-8");

    // Extract task number and title
    const titleMatch = taskContent.match(/# Task (\d{3}): (.+)/);
    if (!titleMatch) continue;

    const taskNumber = titleMatch[1];
    const taskTitle = titleMatch[2];

    // Extract dependencies
    const depMatch = taskContent.match(/\*\*Must complete first:\*\* (.+)/);
    const depString = depMatch
      ? depMatch[1].trim()
      : "None (can start immediately)";

    // Parse dependency task numbers
    const deps: string[] = [];
    if (depString !== "None (can start immediately)") {
      const taskRefs = depString.match(/Task \d{3}/g);
      if (taskRefs) {
        deps.push(...taskRefs.map((ref) => ref.replace("Task ", "")));
      }
    }

    tasks.push({
      number: taskNumber,
      title: taskTitle,
      dependencies: deps,
      fileName: file,
    });
  }

  // Group tasks by dependency level
  const groups: TaskInfo[][] = [];
  const processed = new Set<string>();

  // Helper to check if all dependencies are processed
  const canProcess = (task: TaskInfo): boolean => {
    return task.dependencies.every((dep) => processed.has(dep));
  };

  // Group tasks level by level
  while (processed.size < tasks.length) {
    const currentGroup = tasks.filter(
      (task) => !processed.has(task.number) && canProcess(task)
    );

    if (currentGroup.length === 0) {
      // Handle circular dependencies or orphaned tasks
      const remaining = tasks.filter((task) => !processed.has(task.number));
      if (remaining.length > 0) {
        groups.push(remaining);
        remaining.forEach((task) => processed.add(task.number));
      }
      break;
    }

    groups.push(currentGroup);
    currentGroup.forEach((task) => processed.add(task.number));
  }

  // Generate dependency section
  let dependencySection = "";

  if (groups.length === 0) {
    dependencySection =
      "_Task dependencies will be shown here as tasks are added. Tasks will be grouped by parallel execution possibilities._";
  } else {
    groups.forEach((group, index) => {
      const groupNumber = index + 1;
      const emoji =
        index === 0 ? "🟢" : index === groups.length - 1 ? "🔴" : "🟡";
      const label =
        index === 0
          ? "Start Immediately"
          : index === groups.length - 1 && groups.length > 2
          ? "Final Tasks"
          : `After Group ${index}`;

      dependencySection += `**${emoji} Group ${groupNumber}** (${label}):\n`;

      group.forEach((task) => {
        const depInfo =
          task.dependencies.length > 0
            ? ` - needs ${task.dependencies.join(", ")}`
            : "";
        dependencySection += `- [ ] [${task.number}](./${task.fileName}) - ${task.title}${depInfo}\n`;
      });

      dependencySection += "\n";
    });

    dependencySection += `> **Parallelization tip:** Tasks within the same group can be worked on simultaneously by different team members or agents. Tasks in different groups must be completed sequentially.`;
  }

  // Replace the task dependencies section
  const depSectionStart = content.indexOf("## Task Dependencies");
  const depSectionEnd = content.indexOf("## Progress Tracker");

  if (depSectionStart !== -1 && depSectionEnd !== -1) {
    const before = content.substring(0, depSectionStart);
    const after = content.substring(depSectionEnd);

    const updatedContent =
      before + "## Task Dependencies\n\n" + dependencySection + "\n" + after;

    await writeFile(readmePath, updatedContent);
  } else {
    // Fallback: just write the original content
    await writeFile(readmePath, content);
  }
}
