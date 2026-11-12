import { QueryClient } from '@tanstack/react-query';

import { shouldRetryQuery } from '@/entities/auth/lib';
import { ApiError } from '@/shared/api';

/** HTTP 4xx окончательны; refresh и повтор 401 уже выполняет auth-транспорт. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500 &&
            error.status !== 429
          )
            return false;
          return shouldRetryQuery(failureCount, error, 1);
        },
      },
      mutations: { retry: false },
    },
  });
}

export const queryClient = createQueryClient();
