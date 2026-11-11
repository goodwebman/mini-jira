import { userSearchQuerySchema, userSearchResponseSchema } from '@gwmt/contracts';
import { queryOptions } from '@tanstack/react-query';
import type { UserSearchQuery } from '../model';
import { apiClient, withQuery } from '@/shared/api';

export function userSearchPath(params: UserSearchQuery = {}): string {
  return withQuery('/users/search', userSearchQuerySchema.parse(params));
}

/** GET `/users/search`. Пустой q возвращает людей с других досок. */
export async function searchUsers(params: UserSearchQuery = {}, signal?: AbortSignal) {
  return apiClient.get<unknown>(userSearchPath(params), { signal }).then(userSearchResponseSchema.parse);
}

export const userQueryKeys = {
  all: ['user'] as const,
  search: (params: UserSearchQuery = {}) => ['user', 'search', {
    ...params,
    ...(params.q === undefined ? {} : { q: params.q.trim() }),
  }] as const,
};

export function userSearchQueryOptions(params: UserSearchQuery = {}) {
  const q = params.q?.trim();
  // Один символ допустим в поле ввода, но сервер требует минимум два.
  const enabled = q === undefined || q.length === 0 || q.length >= 2;
  const query = enabled ? userSearchQuerySchema.parse(params) : { ...params, q };
  return queryOptions({
    queryKey: userQueryKeys.search(query),
    queryFn: ({ signal }) => searchUsers(query, signal),
    enabled,
  });
}
