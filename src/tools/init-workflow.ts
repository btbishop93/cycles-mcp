import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureDocsStructure, loadConfig, saveConfig } from "../config.js";
import {
  getCurrentDate,
  loadTemplate,
  replaceTemplateVars,
  TemplateType,
} from "../templates/index.js";
import type { CycleConfig } from "../types.js";

interface InitWorkflowArgs {
  workspaceRoot: string;
  projectName?: string;
  sizing_mode?: "simple" | "granular";
  simple_tier?: "junior" | "mid" | "senior";
  difficulty?: "junior" | "mid" | "senior";
  task_duration?: "0.5h" | "1h" | "2h" | "4h" | "8h";
  detail_level?: "high" | "medium" | "low";
  cycle_duration_unit?: "weeks" | "months" | "quarters";
  cycle_duration_value?: number;
  hours_per_cycle?: number;
}

export async function initWorkflow(args: InitWorkflowArgs): Promise<string> {
  const { workspaceRoot } = args;

  // Check if already initialized
  const existingConfig = await loadConfig(workspaceRoot);
  if (existingConfig) {
    return "Workflow already initialized. Use update-config to modify settings.";
  }

  // Validate required parameters
  if (!args.sizing_mode) {
    return "❌ Error: sizing_mode is required. Please specify 'simple' or 'granular'.";
  }

  if (args.sizing_mode === "simple" && !args.simple_tier) {
    return "❌ Error: simple_tier is required when sizing_mode is 'simple'. Please specify 'junior', 'mid', or 'senior'.";
  }

  if (args.sizing_mode === "granular") {
    if (!args.difficulty) {
      return "❌ Error: difficulty is required when sizing_mode is 'granular'.";
    }
    if (!args.task_duration) {
      return "❌ Error: task_duration is required when sizing_mode is 'granular'.";
    }
    if (!args.detail_level) {
      return "❌ Error: detail_level is required when sizing_mode is 'granular'.";
    }
  }

  if (!args.cycle_duration_unit) {
    return "❌ Error: cycle_duration_unit is required. Please specify 'weeks', 'months', or 'quarters'.";
  }

  if (!args.cycle_duration_value) {
    return "❌ Error: cycle_duration_value is required. Please specify how many weeks/months/quarters per cycle.";
  }

  if (!args.hours_per_cycle) {
    return "❌ Error: hours_per_cycle is required. Please specify how many hours are available per cycle.";
  }

  // Ensure directory structure
  await ensureDocsStructure(workspaceRoot);

  // Create config
  const cycle_duration = {
    unit: args.cycle_duration_unit,
    value: args.cycle_duration_value,
  } as any;

  const config: CycleConfig = {
    sizing_mode: args.sizing_mode,
    simple_tier: args.simple_tier,
    difficulty: args.difficulty,
    task_duration: args.task_duration,
    detail_level: args.detail_level,
    cycle_duration,
    hours_per_cycle: args.hours_per_cycle,
  };

  await saveConfig(workspaceRoot, config);

  // Create WORKFLOW.md
  const workflowTemplate = await loadTemplate(TemplateType.WORKFLOW);
  const workflowPath = join(workspaceRoot, "WORKFLOW.md");
  await writeFile(workflowPath, workflowTemplate);

  // Create cycles.md
  const cyclesTemplate = await loadTemplate(TemplateType.CYCLES);
  const _projectName = args.projectName || "Project";
  const cyclesContent = replaceTemplateVars(cyclesTemplate, {
    CURRENT_CYCLE: "01",
    TOTAL_CYCLES: "1",
    DATE: getCurrentDate(),
  });
  const cyclesPath = join(workspaceRoot, "docs", "cycles.md");
  await writeFile(cyclesPath, cyclesContent);

  // Create PR template in .github directory
  const prTemplate = await loadTemplate(TemplateType.PR);
  const githubDir = join(workspaceRoot, ".github");
  await mkdir(githubDir, { recursive: true });
  const prTemplatePath = join(githubDir, "pull_request_template.md");
  await writeFile(prTemplatePath, prTemplate);

  return `✅ Workflow initialized successfully!

Created:
- .cycles-config.json (configuration)
- WORKFLOW.md (workflow guide)
- docs/cycles.md (cycles tracker)
- docs/cycles/ (cycles directory)
- .github/pull_request_template.md (PR template)

Configuration:
- Sizing Mode: ${config.sizing_mode}
${
  config.sizing_mode === "simple"
    ? `- Tier: ${config.simple_tier}`
    : `- Difficulty: ${config.difficulty}\n- Task Duration: ${config.task_duration}\n- Detail Level: ${config.detail_level}`
}
- Cycle Duration: ${config.cycle_duration.value} ${config.cycle_duration.unit}
- Hours Per Cycle: ${config.hours_per_cycle}

Next steps:
1. Review WORKFLOW.md to understand the development process
2. Use create-cycle to create your first cycle
3. Use add-task to add tasks to your cycle`;
}
