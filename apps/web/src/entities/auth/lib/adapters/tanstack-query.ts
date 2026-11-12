import { isSessionBoundary } from '../auth-store';
import { isAuthError } from '../errors';
import type { AuthEventSource, Unsubscribe } from '../types';

export interface QueryClientLike {
  clear(): void;
}

/**
 * Сбрасывает кэш на границе сессии, чтобы следующий пользователь не увидел чужие данные.
 * Транспорт TanStack Query не трогает: в `queryFn` используйте `authService.fetch`.
 */
export function bindAuthToQueryClient<TUser>(
  auth: AuthEventSource<TUser>,
  client: QueryClientLike,
): Unsubscribe {
  return auth.on((event) => {
    if (isSessionBoundary(event)) client.clear();
  });
}

/** Для опции `retry`: окончательные ошибки авторизации не повторяются. */
export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
  limit = 3,
): boolean {
  if (isAuthError(error) && !error.retryable) return false;
  return failureCount < limit;
}
