import { type TaskFilters, isTaskPriority } from '@/entities/task';

const filterKeys = ['q', 'priority', 'assignee'];

export function readLegacyBoardFilters(search: string) {
  const params = new URLSearchParams(search);
  if (!filterKeys.some((key) => params.has(key))) return null;

  const priority = params.get('priority');
  const filters: TaskFilters = {
    query: params.get('q') ?? '',
    priority: isTaskPriority(priority) ? priority : 'all',
    assigneeIds: [...new Set(params.getAll('assignee').filter(Boolean))],
  };
  for (const key of filterKeys) params.delete(key);
  return { filters, search: params.toString() };
}
