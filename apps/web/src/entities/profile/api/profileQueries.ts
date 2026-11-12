import {
  meSchema,
  myTaskStatsSchema,
  navSummaryQuerySchema,
  navSummarySchema,
} from '@gwmt/contracts';
import { queryOptions } from '@tanstack/react-query';

import { apiClient, withQuery } from '@/shared/api';

import type { NavSummaryQuery } from '../model';

export function navSummaryPath(params: NavSummaryQuery = {}): string {
  return withQuery('/me/nav-summary', navSummaryQuerySchema.parse(params));
}

/** GET `/me`. */
export async function fetchProfile(signal?: AbortSignal) {
  return apiClient.get<unknown>('/me', { signal }).then(meSchema.parse);
}

/** GET `/me/nav-summary`. Без boardId сервер выбирает последнюю доску. */
export async function fetchNavSummary(
  params: NavSummaryQuery = {},
  signal?: AbortSignal,
) {
  return apiClient
    .get<unknown>(navSummaryPath(params), { signal })
    .then(navSummarySchema.parse);
}

/** GET `/me/task-stats`. */
export async function fetchMyTaskStats(signal?: AbortSignal) {
  return apiClient
    .get<unknown>('/me/task-stats', { signal })
    .then(myTaskStatsSchema.parse);
}

export const profileQueryKeys = {
  all: ['profile'] as const,
  detail: ['profile', 'detail'] as const,
  navSummary: (params: NavSummaryQuery = {}) =>
    ['profile', 'nav-summary', navSummaryQuerySchema.parse(params)] as const,
  taskStats: ['profile', 'task-stats'] as const,
};

export const profileQueryOptions = queryOptions({
  queryKey: profileQueryKeys.detail,
  queryFn: ({ signal }) => fetchProfile(signal),
});

export function navSummaryQueryOptions(params: NavSummaryQuery = {}) {
  const query = navSummaryQuerySchema.parse(params);
  return queryOptions({
    queryKey: profileQueryKeys.navSummary(query),
    queryFn: ({ signal }) => fetchNavSummary(query, signal),
  });
}

export const myTaskStatsQueryOptions = queryOptions({
  queryKey: profileQueryKeys.taskStats,
  queryFn: ({ signal }) => fetchMyTaskStats(signal),
});
