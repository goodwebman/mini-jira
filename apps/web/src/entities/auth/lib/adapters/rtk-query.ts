import { isSessionBoundary } from '../auth-store';
import type { AuthEventSource, Unsubscribe } from '../types';

export interface RtkApiLike {
  readonly util: { resetApiState(): unknown };
}

export interface RtkStoreLike {
  dispatch(action: never): unknown;
}

/**
 * Сбрасывает кэш RTK Query на границе сессии. Запросы подключаются через
 * `fetchBaseQuery({ fetchFn: authService.fetch })`.
 */
export function bindAuthToRtkQuery<TUser>(
  auth: AuthEventSource<TUser>,
  store: RtkStoreLike,
  api: RtkApiLike,
): Unsubscribe {
  return auth.on((event) => {
    if (isSessionBoundary(event))
      store.dispatch(api.util.resetApiState() as never);
  });
}
