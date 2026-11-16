import type { QueryClient } from '@tanstack/react-query';

/**
 * Домены данных для инвалидации. Слайсы entities изолированы и не знают ключей
 * друг друга, поэтому запрос помечает, от каких данных зависит, а мутация
 * сбрасывает домен целиком. Так же устроены теги RTK Query.
 *
 * - `tasks`: всё, что считается из задач — доска, «мои задачи», сводка меню, KPI;
 * - `boards`: список и детали досок, сводка меню;
 * - `members`: участники досок;
 * - `profile`: текущий пользователь.
 */
export const QUERY_TAGS = {
  boards: 'boards',
  members: 'members',
  notifications: 'notifications',
  profile: 'profile',
  tasks: 'tasks',
} as const;

export type QueryTag = (typeof QUERY_TAGS)[keyof typeof QUERY_TAGS];

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { readonly tags?: readonly QueryTag[] };
    mutationMeta: {
      /** `false`: ошибку показывает сама форма, общий тост не нужен. */
      readonly toast?: boolean;
    };
  }
}

/**
 * Помечает запросы домена устаревшими. Активные перезапрашиваются; с
 * `refetch: false` только помечаются — когда свежие данные уже положены в кэш.
 */
export function invalidateTags(
  client: QueryClient,
  tags: readonly QueryTag[],
  { refetch = true }: { readonly refetch?: boolean } = {},
): Promise<void> {
  return client.invalidateQueries({
    predicate: (query) =>
      query.meta?.tags?.some((tag) => tags.includes(tag)) ?? false,
    refetchType: refetch ? 'active' : 'none',
  });
}
