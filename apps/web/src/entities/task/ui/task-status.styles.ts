import type { TaskStatus } from '@gwmt/contracts';

/** Цвет точки статуса: бейдж и заголовок колонки. */
export const TASK_STATUS_DOT_CLASS: Record<TaskStatus, string> = {
  todo: 'bg-status-todo',
  work: 'bg-status-work',
  review: 'bg-status-review',
  test: 'bg-status-test',
  done: 'bg-status-done',
};

export const STATUS_TINT_CLASS: Record<TaskStatus, string> = {
  todo: 'bg-status-todo-tint',
  work: 'bg-status-work-tint',
  review: 'bg-status-review-tint',
  test: 'bg-status-test-tint',
  done: 'bg-status-done-tint',
};
