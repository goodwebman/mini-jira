import {
  sprintKpiSchema,
  sprintListResponseSchema,
  sprintsQuerySchema,
} from '@gwmt/contracts';
import { type QueryClient, queryOptions } from '@tanstack/react-query';

import { QUERY_TAGS, apiClient, withQuery } from '@/shared/api';
import { syncServerClock } from '@/shared/lib/time';

import type { SprintsQuery } from '../model';

export function sprintsPath(
  boardId: number,
  params: SprintsQuery = {},
): string {
  return withQuery(
    `/boards/${boardId}/sprints`,
    sprintsQuerySchema.parse(params),
  );
}

/** GET `/boards/{boardId}/sprints` — от новых к старым. */
export async function fetchBoardSprints(
  boardId: number,
  params: SprintsQuery = {},
  signal?: AbortSignal,
) {
  return apiClient
    .get<unknown>(sprintsPath(boardId, params), { signal })
    .then(sprintListResponseSchema.parse);
}

/** GET `/boards/{boardId}/sprints/{number}/kpi`. */
export async function fetchSprintKpi(
  boardId: number,
  number: number,
  signal?: AbortSignal,
) {
  return apiClient
    .get<unknown>(`/boards/${boardId}/sprints/${number}/kpi`, { signal })
    .then(sprintKpiSchema.parse)
    .then(syncServerClock);
}

export const sprintQueryKeys = {
  all: ['sprint'] as const,
  list: (boardId: number, params: SprintsQuery = {}) =>
    ['sprint', 'list', boardId, sprintsQuerySchema.parse(params)] as const,
  kpi: (boardId: number, number: number) =>
    ['sprint', 'kpi', boardId, number] as const,
};

export function removeBoardSprintsFromCache(
  client: QueryClient,
  boardId: number,
): void {
  client.removeQueries({
    queryKey: sprintQueryKeys.all,
    predicate: ({ queryKey }) => queryKey[2] === boardId,
  });
}

export function boardSprintsQueryOptions(
  boardId: number,
  params: SprintsQuery = {},
) {
  const query = sprintsQuerySchema.parse(params);
  return queryOptions({
    queryKey: sprintQueryKeys.list(boardId, query),
    queryFn: ({ signal }) => fetchBoardSprints(boardId, query, signal),
    meta: { tags: [QUERY_TAGS.tasks] },
    enabled: Number.isInteger(boardId) && boardId > 0,
  });
}

export function sprintKpiQueryOptions(boardId: number, number: number) {
  return queryOptions({
    queryKey: sprintQueryKeys.kpi(boardId, number),
    queryFn: ({ signal }) => fetchSprintKpi(boardId, number, signal),
    meta: { tags: [QUERY_TAGS.tasks] },
    enabled:
      Number.isInteger(boardId) &&
      boardId > 0 &&
      Number.isInteger(number) &&
      number > 0,
  });
}
