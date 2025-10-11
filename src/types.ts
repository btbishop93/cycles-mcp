import { z } from 'zod';

// Task sizing modes
export const TaskSizingModeSchema = z.enum(['simple', 'granular']);
export type TaskSizingMode = z.infer<typeof TaskSizingModeSchema>;

// Simple tier (junior/mid/senior)
export const SimpleTierSchema = z.enum(['junior', 'mid', 'senior']);
export type SimpleTier = z.infer<typeof SimpleTierSchema>;

// Granular options
export const DifficultyLevelSchema = z.enum(['junior', 'mid', 'senior']);
export const TaskDurationSchema = z.enum(['0.5h', '1h', '2h', '4h', '8h']);
export const DetailLevelSchema = z.enum(['high', 'medium', 'low']);

export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;
export type TaskDuration = z.infer<typeof TaskDurationSchema>;
export type DetailLevel = z.infer<typeof DetailLevelSchema>;

// Cycle duration
export const CycleDurationSchema = z.union([
  z.object({
    unit: z.literal('weeks'),
    value: z.number().min(1).max(3),
  }),
  z.object({
    unit: z.literal('months'),
    value: z.number().min(1).max(2),
  }),
  z.object({
    unit: z.literal('quarters'),
    value: z.literal(1),
  }),
]);

export type CycleDuration = z.infer<typeof CycleDurationSchema>;

// Config schema
export const CycleConfigSchema = z.object({
  sizing_mode: TaskSizingModeSchema,
  
  // Simple mode
  simple_tier: SimpleTierSchema.optional(),
  
  // Granular mode
  difficulty: DifficultyLevelSchema.optional(),
  task_duration: TaskDurationSchema.optional(),
  detail_level: DetailLevelSchema.optional(),
  
  // Cycle settings
  cycle_duration: CycleDurationSchema.default({
    unit: 'weeks',
    value: 1,
  }),
  hours_per_cycle: z.number().min(1).max(500),
});

export type CycleConfig = z.infer<typeof CycleConfigSchema>;

// Task metadata
export interface TaskMetadata {
  number: string; // e.g., "001"
  title: string;
  difficulty: DifficultyLevel;
  duration: number; // in hours
  detailLevel: DetailLevel;
}

// Cycle metadata
export interface CycleMetadata {
  number: string; // e.g., "01"
  name: string;
  totalHours: number;
  totalTasks: number;
  duration: CycleDuration;
}

// Helper functions
export function parseDuration(duration: TaskDuration): number {
  return parseFloat(duration.replace('h', ''));
}

export function formatCycleDuration(duration: CycleDuration): string {
  const value = duration.value;
  if (duration.unit === 'weeks') {
    return `${value} week${value > 1 ? 's' : ''}`;
  } else if (duration.unit === 'months') {
    return `${value} month${value > 1 ? 's' : ''}`;
  } else {
    return '1 quarter (3 months)';
  }
}

// Simple tier to granular mapping
export function simpleTierToGranular(tier: SimpleTier): {
  difficulty: DifficultyLevel;
  duration: TaskDuration;
  detailLevel: DetailLevel;
} {
  switch (tier) {
    case 'junior':
      return {
        difficulty: 'junior',
        duration: '1h',
        detailLevel: 'high',
      };
    case 'mid':
      return {
        difficulty: 'mid',
        duration: '2h',
        detailLevel: 'medium',
      };
    case 'senior':
      return {
        difficulty: 'senior',
        duration: '4h',
        detailLevel: 'low',
      };
  }
}

