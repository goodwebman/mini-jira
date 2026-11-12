import { QueryClient, isCancelledError } from '@tanstack/react-query';

import { AuthError, shouldRetryQuery } from '@/entities/auth';
import { HttpError, readApiError } from '@/shared/api';

/** HTTP 4xx окончательны; refresh и повтор 401 уже выполняет auth-транспорт. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (
            error instanceof HttpError &&
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

export function bindQueryClientToasts(
  client: QueryClient,
  toast: (message: string) => unknown,
): () => void {
  const notify = (error: unknown) => {
    if (
      isCancelledError(error) ||
      (error instanceof Error && error.name === 'AbortError') ||
      (error instanceof AuthError &&
        (error.code === 'aborted' || error.code === 'session_changed'))
    )
      return;
    toast(readApiError(error).message);
  };
  const unsubscribeQueries = client.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'error')
      notify(event.action.error);
  });
  const unsubscribeMutations = client.getMutationCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'error')
      notify(event.action.error);
  });
  return () => {
    unsubscribeQueries();
    unsubscribeMutations();
  };
}
