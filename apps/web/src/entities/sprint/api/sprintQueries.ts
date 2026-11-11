import { sprintKpiSchema, sprintListResponseSchema, sprintsQuerySchema } from '@gwmt/contracts';
import { queryOptions } from '@tanstack/react-query';
import type { SprintsQuery } from '../model';
import { apiClient, withQuery } from '@/shared/api';

export function sprintsPath(boardId: number, params: SprintsQuery = {}): string {
  return withQuery(`/boards/${boardId}/sprints`, sprintsQuerySchema.parse(params));
}

/** GET `/boards/{boardId}/sprints` — от новых к старым. */
export async function fetchBoardSprints(boardId: number, params: SprintsQuery = {}, signal?: AbortSignal) {
  return apiClient.get<unknown>(sprintsPath(boardId, params), { signal }).then(sprintListResponseSchema.parse);
}

/** GET `/boards/{boardId}/sprints/{number}/kpi`. */
export async function fetchSprintKpi(boardId: number, number: number, signal?: AbortSignal) {
  return apiClient.get<unknown>(`/boards/${boardId}/sprints/${number}/kpi`, { signal }).then(sprintKpiSchema.parse);
}

export const sprintQueryKeys = {
  all: ['sprint'] as const,
  list: (boardId: number, params: SprintsQuery = {}) => ['sprint', 'list', boardId, sprintsQuerySchema.parse(params)] as const,
  kpi: (boardId: number, number: number) => ['sprint', 'kpi', boardId, number] as const,
};

export function boardSprintsQueryOptions(boardId: number, params: SprintsQuery = {}) {
  const query = sprintsQuerySchema.parse(params);
  return queryOptions({
    queryKey: sprintQueryKeys.list(boardId, query),
    queryFn: ({ signal }) => fetchBoardSprints(boardId, query, signal),
    enabled: Number.isInteger(boardId) && boardId > 0,
  });
}

export function sprintKpiQueryOptions(boardId: number, number: number) {
  return queryOptions({
    queryKey: sprintQueryKeys.kpi(boardId, number),
    queryFn: ({ signal }) => fetchSprintKpi(boardId, number, signal),
    enabled: Number.isInteger(boardId) && boardId > 0 && Number.isInteger(number) && number > 0,
  });
}
