import { type TaskFilters, isTaskPriority } from '@/entities/task';

export function readBoardFilters(params: URLSearchParams): TaskFilters {
  const priority = params.get('priority');
  return {
    query: params.get('q') ?? '',
    priority: isTaskPriority(priority) ? priority : 'all',
    assigneeIds: [...new Set(params.getAll('assignee').filter(Boolean))],
  };
}

/** Меняем только параметры фильтров: остальные параметры адреса сохраняются. */
export function writeBoardFilters(
  params: URLSearchParams,
  patch: Partial<TaskFilters>,
): URLSearchParams {
  const filters = { ...readBoardFilters(params), ...patch };
  const next = new URLSearchParams(params);
  for (const key of ['q', 'priority', 'assignee']) next.delete(key);
  if (filters.query) next.set('q', filters.query);
  if (filters.priority !== 'all') next.set('priority', filters.priority);
  for (const id of new Set(filters.assigneeIds)) {
    if (id) next.append('assignee', id);
  }
  return next;
}
