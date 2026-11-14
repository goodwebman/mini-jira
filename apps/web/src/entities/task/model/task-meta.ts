import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_ROLES,
  TASK_ROLE_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskRole,
  type TaskStatus,
} from '@gwmt/contracts';

export interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
}

export const TASK_STATUS_OPTIONS: readonly Option<TaskStatus>[] =
  TASK_STATUSES.map((value) => ({ value, label: TASK_STATUS_LABELS[value] }));

export const TASK_PRIORITY_OPTIONS: readonly Option<TaskPriority>[] =
  TASK_PRIORITIES.map((value) => ({
    value,
    label: TASK_PRIORITY_LABELS[value],
  }));

export const TASK_ROLE_OPTIONS: readonly Option<TaskRole>[] = TASK_ROLES.map(
  (value) => ({ value, label: TASK_ROLE_LABELS[value] }),
);

export function isTaskStatus(value: unknown): value is TaskStatus {
  return (TASK_STATUSES as readonly unknown[]).includes(value);
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return (TASK_PRIORITIES as readonly unknown[]).includes(value);
}

export function isTaskRole(value: unknown): value is TaskRole {
  return (TASK_ROLES as readonly unknown[]).includes(value);
}

export {
  TASK_PRIORITY_LABELS,
  TASK_ROLE_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
};
