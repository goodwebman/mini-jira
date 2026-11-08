/** Статусы задач. Совпадают с `TaskStatus` из @gwmt/contracts. */
export type UITaskStatus = 'todo' | 'work' | 'review' | 'test' | 'done';

/** Цвет точки статуса: бейдж и заголовок колонки. */
export const STATUS_DOT_CLASS: Record<UITaskStatus, string> = {
  todo: 'bg-status-todo',
  work: 'bg-status-work',
  review: 'bg-status-review',
  test: 'bg-status-test',
  done: 'bg-status-done',
};

export const STATUS_TINT_CLASS: Record<UITaskStatus, string> = {
  todo: 'bg-status-todo-tint',
  work: 'bg-status-work-tint',
  review: 'bg-status-review-tint',
  test: 'bg-status-test-tint',
  done: 'bg-status-done-tint',
};
