import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import {
  loadConfig,
  saveConfig,
  getDefaultConfig,
  ensureDocsStructure,
} from "../config.js";
import {
  loadTemplate,
  replaceTemplateVars,
  getCurrentDate,
  TemplateType,
} from "../templates/index.js";
import { CycleConfig } from "../types.js";

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

  // Ensure directory structure
  await ensureDocsStructure(workspaceRoot);

  // Create config
  let cycle_duration;
  if (args.cycle_duration_unit) {
    cycle_duration = {
      unit: args.cycle_duration_unit,
      value: args.cycle_duration_value || 1,
    } as any;
  } else {
    cycle_duration = { unit: "weeks" as const, value: 1 };
  }

  const config: CycleConfig = {
    sizing_mode: args.sizing_mode || "simple",
    simple_tier: args.simple_tier || "mid",
    difficulty: args.difficulty,
    task_duration: args.task_duration,
    detail_level: args.detail_level,
    cycle_duration,
    hours_per_cycle: args.hours_per_cycle || 8,
  };

  await saveConfig(workspaceRoot, config);

  // Create WORKFLOW.md
  const workflowTemplate = await loadTemplate(TemplateType.WORKFLOW);
  const workflowPath = join(workspaceRoot, "WORKFLOW.md");
  await writeFile(workflowPath, workflowTemplate);

  // Create cycles.md
  const cyclesTemplate = await loadTemplate(TemplateType.CYCLES);
  const projectName = args.projectName || "Project";
  const cyclesContent = replaceTemplateVars(cyclesTemplate, {
    CURRENT_CYCLE: "01",
    TOTAL_CYCLES: "1",
    DATE: getCurrentDate(),
  });
  const cyclesPath = join(workspaceRoot, "docs", "cycles.md");
  await writeFile(cyclesPath, cyclesContent);

  return `✅ Workflow initialized successfully!

Created:
- .cycles-config.json (configuration)
- WORKFLOW.md (workflow guide)
- docs/cycles.md (cycles tracker)
- docs/cycles/ (cycles directory)

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
