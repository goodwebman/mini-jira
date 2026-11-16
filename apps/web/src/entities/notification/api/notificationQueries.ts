import {
  notificationsQuerySchema,
  notificationsResponseSchema,
} from '@gwmt/contracts';
import { queryOptions } from '@tanstack/react-query';

import { QUERY_TAGS, apiClient, withQuery } from '@/shared/api';

export const notificationQueryKeys = {
  all: ['notification'] as const,
  list: (page: number) => ['notification', 'list', page] as const,
};

export function notificationsQueryOptions(page = 1) {
  const query = notificationsQuerySchema.parse({ page });
  return queryOptions({
    queryKey: notificationQueryKeys.list(query.page),
    queryFn: ({ signal }) =>
      apiClient
        .get<unknown>(withQuery('/notifications', query), { signal })
        .then(notificationsResponseSchema.parse),
    meta: { tags: [QUERY_TAGS.notifications] },
    staleTime: 0,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
