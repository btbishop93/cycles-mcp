import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export enum TemplateType {
  WORKFLOW = 'workflow.md',
  CYCLES = 'cycles.md',
  CYCLE_README = 'cycle-readme.md',
  TASK = 'task-template.md',
  PR = 'pr-template.md',
}

export async function loadTemplate(type: TemplateType): Promise<string> {
  const templatePath = join(__dirname, type);
  return await readFile(templatePath, 'utf-8');
}

export function replaceTemplateVars(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function padNumber(num: number, length: number): string {
  return num.toString().padStart(length, '0');
}

export function generateProgressBar(completed: number, total: number): string {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const filled = Math.round((completed / total) * 20);
  const empty = 20 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage}%`;
}

