import type { TaskCard, TaskPriority } from '@gwmt/contracts';

export interface TaskFilters {
  /** Поиск по названию и ключу, без учёта регистра. */
  readonly query: string;
  readonly priority: 'all' | TaskPriority;
  /** Задача подходит, если любой из этих людей в ней участвует. */
  readonly assigneeIds: readonly string[];
}

export const EMPTY_TASK_FILTERS: TaskFilters = {
  query: '',
  priority: 'all',
  assigneeIds: [],
};

/** Удалённые участники и гости не должны оставаться невидимыми фильтрами. */
export function effectiveFilters(
  filters: TaskFilters,
  assignableIds: readonly string[],
): TaskFilters {
  if (filters.assigneeIds.length === 0) return filters;
  const assignable = new Set(assignableIds);
  const assigneeIds = filters.assigneeIds.filter((id) => assignable.has(id));
  return assigneeIds.length === filters.assigneeIds.length
    ? filters
    : { ...filters, assigneeIds };
}

export function hasActiveTaskFilters(filters: TaskFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.priority !== 'all' ||
    filters.assigneeIds.length > 0
  );
}

export function taskPeopleIds(people: TaskCard['people']): string[] {
  return [people.author, people.reviewer, people.tester, people.designer]
    .filter((user) => user !== null)
    .map((user) => user.id);
}

export function matchesTaskFilters(
  task: Pick<TaskCard, 'key' | 'people' | 'priority' | 'title'>,
  filters: TaskFilters,
): boolean {
  return createTaskFilterMatcher(filters)(task);
}

function createTaskFilterMatcher(filters: TaskFilters) {
  const query = filters.query.trim().toLowerCase();
  const assignees = new Set(filters.assigneeIds);
  return (task: Pick<TaskCard, 'key' | 'people' | 'priority' | 'title'>) =>
    (filters.priority === 'all' || task.priority === filters.priority) &&
    (!query ||
      task.title.toLowerCase().includes(query) ||
      task.key.toLowerCase().includes(query)) &&
    (assignees.size === 0 ||
      taskPeopleIds(task.people).some((id) => assignees.has(id)));
}

export function filterTasks<
  T extends Pick<TaskCard, 'key' | 'people' | 'priority' | 'title'>,
>(tasks: readonly T[], filters: TaskFilters): T[] {
  return hasActiveTaskFilters(filters)
    ? tasks.filter(createTaskFilterMatcher(filters))
    : [...tasks];
}
