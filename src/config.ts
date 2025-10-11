import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { CycleConfig, CycleConfigSchema } from './types.js';

const CONFIG_FILENAME = '.cycles-config.json';

export async function loadConfig(workspaceRoot: string): Promise<CycleConfig | null> {
  try {
    const configPath = join(workspaceRoot, CONFIG_FILENAME);
    const content = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    return CycleConfigSchema.parse(parsed);
  } catch (error) {
    return null;
  }
}

export async function saveConfig(workspaceRoot: string, config: CycleConfig): Promise<void> {
  const configPath = join(workspaceRoot, CONFIG_FILENAME);
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

export function getDefaultConfig(): CycleConfig {
  return {
    sizing_mode: 'simple',
    simple_tier: 'mid',
    cycle_duration: {
      unit: 'weeks',
      value: 1,
    },
    hours_per_cycle: 8,
  };
}

export async function ensureDocsStructure(workspaceRoot: string): Promise<void> {
  const docsDir = join(workspaceRoot, 'docs');
  const cyclesDir = join(docsDir, 'cycles');
  
  await mkdir(docsDir, { recursive: true });
  await mkdir(cyclesDir, { recursive: true });
}

