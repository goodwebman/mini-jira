import type { Monitoring } from '@gwmt/monitoring';
import { type QueryClient, isCancelledError } from '@tanstack/react-query';

import type { AuthEvent, AuthState } from '@/entities/auth';
import { HttpError } from '@/shared/api';

interface AuthSource<TUser> {
  getSnapshot(): AuthState<TUser>;
  on(listener: (event: AuthEvent<TUser>) => void): () => void;
}

export function bindAuthMonitoring<TUser>(
  auth: AuthSource<TUser>,
  monitoring: Monitoring,
  identify: (user: TUser) => string,
): () => void {
  const sync = (state: AuthState<TUser>) => {
    monitoring.setUser(
      state.status === 'authenticated' && state.user
        ? identify(state.user)
        : null,
    );
  };
  const unsubscribe = auth.on((event) => {
    sync(event.state);
    monitoring.addBreadcrumb(event.type);
  });
  sync(auth.getSnapshot());
  return () => {
    unsubscribe();
    monitoring.setUser(null);
  };
}

/** Capture only terminal cache errors; retry attempts and observers don't duplicate events. */
export function bindQueryMonitoring(
  client: QueryClient,
  monitoring: Monitoring,
): () => void {
  const capture = (error: unknown, source: string) => {
    if (!isCancelledError(error))
      monitoring.captureException(error, {
        tags: {
          source,
          ...(error instanceof HttpError
            ? {
                'http.status_code': String(error.status),
                ...(error.requestId ? { request_id: error.requestId } : {}),
              }
            : {}),
        },
      });
  };
  const offQueries = client.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'error')
      capture(event.action.error, 'query');
  });
  const offMutations = client.getMutationCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'error')
      capture(event.action.error, 'mutation');
  });
  return () => {
    offQueries();
    offMutations();
  };
}
