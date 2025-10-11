import { writeFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { loadConfig } from '../config.js';
import {
  loadTemplate,
  replaceTemplateVars,
  padNumber,
  TemplateType,
} from '../templates/index.js';
import { formatCycleDuration } from '../types.js';

interface CreateCycleArgs {
  workspaceRoot: string;
  cycleName: string;
  cycleDescription?: string;
  cycleGoal?: string;
  successCriteria?: string;
  deliverables?: string;
}

export async function createCycle(args: CreateCycleArgs): Promise<string> {
  const { workspaceRoot, cycleName } = args;

  // Load config
  const config = await loadConfig(workspaceRoot);
  if (!config) {
    return '❌ Workflow not initialized. Run init-workflow first.';
  }

  // Determine next cycle number
  const cyclesDir = join(workspaceRoot, 'docs', 'cycles');
  const existing = await readdir(cyclesDir).catch(() => []);
  const cycleNumbers = existing
    .filter((dir) => /^\d{2}-/.test(dir))
    .map((dir) => parseInt(dir.substring(0, 2)))
    .filter((n) => !isNaN(n));
  const nextCycleNum = cycleNumbers.length > 0 ? Math.max(...cycleNumbers) + 1 : 1;
  const cycleNumber = padNumber(nextCycleNum, 2);

  // Create cycle directory
  const cycleDirName = `${cycleNumber}-${cycleName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')}`;
  const cyclePath = join(cyclesDir, cycleDirName);
  await mkdir(cyclePath, { recursive: true });

  // Generate cycle README
  const template = await loadTemplate(TemplateType.CYCLE_README);
  const cycleContent = replaceTemplateVars(template, {
    CYCLE_NUMBER: cycleNumber,
    CYCLE_NAME: cycleName,
    CYCLE_DURATION: formatCycleDuration(config.cycle_duration),
    ESTIMATED_HOURS: config.hours_per_cycle.toString(),
    CYCLE_DESCRIPTION:
      args.cycleDescription || 'This cycle focuses on ' + cycleName.toLowerCase() + '.',
    CYCLE_GOAL: args.cycleGoal || 'Complete all tasks in this cycle successfully.',
    TASK_COUNT: '0',
    TASK_LIST: '_No tasks yet. Use add-task to create tasks._',
    SUCCESS_CRITERIA:
      args.successCriteria ||
      `- ✅ All tasks completed
- ✅ All acceptance criteria met
- ✅ Code is tested and working`,
    DELIVERABLES:
      args.deliverables ||
      `- ✅ Working implementation
- ✅ Tests passing
- ✅ Documentation updated`,
    NEXT_CYCLE: padNumber(nextCycleNum + 1, 2),
  });

  const readmePath = join(cyclePath, 'README.md');
  await writeFile(readmePath, cycleContent);

  return `✅ Cycle ${cycleNumber} created successfully!

Created:
- ${cycleDirName}/
- ${cycleDirName}/README.md

Configuration:
- Duration: ${formatCycleDuration(config.cycle_duration)}
- Hours Available: ${config.hours_per_cycle}

Next steps:
1. Review the cycle README: docs/cycles/${cycleDirName}/README.md
2. Use add-task to create tasks for this cycle
3. Ensure total task hours ≤ ${config.hours_per_cycle} hours`;
}

