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
  const query = filters.query.trim().toLowerCase();
  if (
    query &&
    !task.title.toLowerCase().includes(query) &&
    !task.key.toLowerCase().includes(query)
  )
    return false;
  if (filters.priority !== 'all' && task.priority !== filters.priority)
    return false;
  if (filters.assigneeIds.length === 0) return true;
  const people = taskPeopleIds(task.people);
  return filters.assigneeIds.some((id) => people.includes(id));
}

export function filterTasks<
  T extends Pick<TaskCard, 'key' | 'people' | 'priority' | 'title'>,
>(tasks: readonly T[], filters: TaskFilters): T[] {
  return hasActiveTaskFilters(filters)
    ? tasks.filter((task) => matchesTaskFilters(task, filters))
    : [...tasks];
}
