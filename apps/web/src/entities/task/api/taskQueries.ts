import {
  TASK_KEY_PATTERN,
  boardTasksResponseSchema,
  myTasksQuerySchema,
  myTasksResponseSchema,
  taskDetailSchema,
  taskSearchQuerySchema,
  taskSearchResponseSchema,
} from '@gwmt/contracts';
import { queryOptions } from '@tanstack/react-query';

import { QUERY_TAGS, apiClient, withQuery } from '@/shared/api';
import { syncServerClock } from '@/shared/lib/time';

import type { MyTasksQuery, TaskSearchQuery } from '../model';

export function myTasksPath(params: MyTasksQuery = {}): string {
  return withQuery('/me/tasks', myTasksQuerySchema.parse(params));
}

export function taskSearchPath(params: TaskSearchQuery = {}): string {
  return withQuery('/tasks/search', taskSearchQuerySchema.parse(params));
}

/** GET `/boards/{boardId}/tasks` — весь активный спринт, фильтрация на клиенте. */
export async function fetchBoardTasks(boardId: number, signal?: AbortSignal) {
  return apiClient
    .get<unknown>(`/boards/${boardId}/tasks`, { signal })
    .then(boardTasksResponseSchema.parse)
    .then(syncServerClock);
}

/** GET `/tasks/{key}`. */
export async function fetchTask(key: string, signal?: AbortSignal) {
  return apiClient
    .get<unknown>(`/tasks/${encodeURIComponent(key)}`, { signal })
    .then(taskDetailSchema.parse)
    .then(syncServerClock);
}

/** GET `/me/tasks` — пагинация и фильтры на сервере. */
export async function fetchMyTasks(
  params: MyTasksQuery = {},
  signal?: AbortSignal,
) {
  return apiClient
    .get<unknown>(myTasksPath(params), { signal })
    .then(myTasksResponseSchema.parse)
    .then(syncServerClock);
}

/** GET `/tasks/search` — поиск для связывания задач. */
export async function searchTasks(
  params: TaskSearchQuery = {},
  signal?: AbortSignal,
) {
  return apiClient
    .get<unknown>(taskSearchPath(params), { signal })
    .then(taskSearchResponseSchema.parse);
}

export const taskQueryKeys = {
  all: ['task'] as const,
  board: (boardId: number) => ['task', 'board', boardId] as const,
  detail: (key: string) => ['task', 'detail', key] as const,
  my: (params: MyTasksQuery = {}) =>
    ['task', 'my', myTasksQuerySchema.parse(params)] as const,
  search: (params: TaskSearchQuery = {}) =>
    ['task', 'search', taskSearchQuerySchema.parse(params)] as const,
};

export function boardTasksQueryOptions(boardId: number) {
  return queryOptions({
    queryKey: taskQueryKeys.board(boardId),
    queryFn: ({ signal }) => fetchBoardTasks(boardId, signal),
    meta: { tags: [QUERY_TAGS.tasks] },
    enabled: Number.isInteger(boardId) && boardId > 0,
  });
}

export function taskQueryOptions(key: string) {
  return queryOptions({
    queryKey: taskQueryKeys.detail(key),
    queryFn: ({ signal }) => fetchTask(key, signal),
    meta: { tags: [QUERY_TAGS.tasks, QUERY_TAGS.members] },
    enabled: TASK_KEY_PATTERN.test(key),
  });
}

export function myTasksQueryOptions(params: MyTasksQuery = {}) {
  const query = myTasksQuerySchema.parse(params);
  return queryOptions({
    queryKey: taskQueryKeys.my(query),
    queryFn: ({ signal }) => fetchMyTasks(query, signal),
    meta: { tags: [QUERY_TAGS.tasks] },
  });
}

export function taskSearchQueryOptions(params: TaskSearchQuery = {}) {
  const query = taskSearchQuerySchema.parse(params);
  return queryOptions({
    queryKey: taskQueryKeys.search(query),
    queryFn: ({ signal }) => searchTasks(query, signal),
    meta: { tags: [QUERY_TAGS.tasks] },
  });
}
