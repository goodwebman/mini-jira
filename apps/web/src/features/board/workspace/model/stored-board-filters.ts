import { type TaskFilters, isTaskPriority } from '@/entities/task';

export function parseStoredBoardFilters(raw: unknown): null | TaskFilters {
  if (raw === null || typeof raw !== 'object') return null;
  const { query, priority, assigneeIds } = raw as Partial<TaskFilters>;
  if (
    typeof query !== 'string' ||
    (priority !== 'all' && !isTaskPriority(priority)) ||
    !Array.isArray(assigneeIds) ||
    !assigneeIds.every((id) => typeof id === 'string' && id.length > 0)
  )
    return null;
  return { query, priority, assigneeIds: [...new Set(assigneeIds)] };
}
