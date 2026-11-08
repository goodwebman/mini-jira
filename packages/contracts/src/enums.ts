import { z } from 'zod';

/** Порядок важен: «вперёд» значит правее в этом списке. */
export const TASK_STATUSES = ['todo', 'work', 'review', 'test', 'done'] as const;
export const taskStatusSchema = z.enum(TASK_STATUSES).meta({
  id: 'TaskStatus',
  description: 'Статус задачи. Порядок слева направо определяет, что такое «вперёд».',
});
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const TASK_PRIORITIES = ['crit', 'high', 'med', 'low'] as const;
export const taskPrioritySchema = z.enum(TASK_PRIORITIES).meta({
  id: 'TaskPriority',
  description: 'Приоритет: критичный, высокий, средний, низкий.',
});
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const TASK_LINK_TYPES = ['rel', 'blocks', 'blockedBy', 'dup'] as const;
export const taskLinkTypeSchema = z.enum(TASK_LINK_TYPES).meta({
  id: 'TaskLinkType',
  description: 'Тип связи со стороны текущей задачи. Обратная сторона: rel и rel, blocks и blockedBy, dup и dup.',
});
export type TaskLinkType = z.infer<typeof taskLinkTypeSchema>;

export const TASK_ROLES = ['author', 'reviewer', 'tester', 'designer'] as const;
export const taskRoleSchema = z.enum(TASK_ROLES).meta({
  id: 'TaskRole',
  description: 'Роль человека в задаче.',
});
export type TaskRole = z.infer<typeof taskRoleSchema>;

export const BOARD_ROLES = ['admin', 'worker', 'guest'] as const;
export const boardRoleSchema = z.enum(BOARD_ROLES).meta({
  id: 'BoardRole',
  description: 'Роль участника на доске. На другой доске у того же человека может быть другая роль.',
});
export type BoardRole = z.infer<typeof boardRoleSchema>;

export const SPRINT_STATES = ['active', 'closed'] as const;
export const sprintStateSchema = z.enum(SPRINT_STATES).meta({ id: 'SprintState' });
export type SprintState = z.infer<typeof sprintStateSchema>;

export const TIMEZONES = ['Europe/Moscow', 'Asia/Yekaterinburg', 'Asia/Novosibirsk'] as const;
export const timezoneSchema = z.enum(TIMEZONES).meta({ id: 'Timezone' });
export type Timezone = z.infer<typeof timezoneSchema>;

export const STAGE_STATUSES = ['work', 'review', 'test'] as const;
export const stageStatusSchema = z.enum(STAGE_STATUSES).meta({ id: 'StageStatus' });
export type StageStatus = z.infer<typeof stageStatusSchema>;
