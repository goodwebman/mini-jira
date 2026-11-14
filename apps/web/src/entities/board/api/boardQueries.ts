import {
  boardDetailSchema,
  boardListResponseSchema,
  boardsQuerySchema,
} from '@gwmt/contracts';
import { queryOptions } from '@tanstack/react-query';

import { QUERY_TAGS, apiClient, withQuery } from '@/shared/api';

import type { BoardsQuery } from '../model';

export function boardsPath(params: BoardsQuery = {}): string {
  return withQuery('/boards', boardsQuerySchema.parse(params));
}

/** GET `/boards` — доски пользователя. */
export async function fetchBoards(
  params: BoardsQuery = {},
  signal?: AbortSignal,
) {
  return apiClient
    .get<unknown>(boardsPath(params), { signal })
    .then(boardListResponseSchema.parse);
}

/** GET `/boards/{boardId}` — доска и участники. */
export async function fetchBoard(boardId: number, signal?: AbortSignal) {
  return apiClient
    .get<unknown>(`/boards/${boardId}`, { signal })
    .then(boardDetailSchema.parse);
}

export const boardQueryKeys = {
  all: ['board'] as const,
  list: (params: BoardsQuery = {}) =>
    ['board', 'list', boardsQuerySchema.parse(params)] as const,
  detail: (boardId: number) => ['board', 'detail', boardId] as const,
};

export function boardsQueryOptions(params: BoardsQuery = {}) {
  const query = boardsQuerySchema.parse(params);
  return queryOptions({
    queryKey: boardQueryKeys.list(query),
    queryFn: ({ signal }) => fetchBoards(query, signal),
    meta: { tags: [QUERY_TAGS.boards] },
  });
}

export function boardQueryOptions(boardId: number) {
  return queryOptions({
    queryKey: boardQueryKeys.detail(boardId),
    queryFn: ({ signal }) => fetchBoard(boardId, signal),
    meta: { tags: [QUERY_TAGS.boards, QUERY_TAGS.members] },
    enabled: Number.isInteger(boardId) && boardId > 0,
  });
}
