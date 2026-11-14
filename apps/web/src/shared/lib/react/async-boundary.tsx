import { type ReactNode, Suspense } from 'react';

import { QueryErrorResetBoundary, useQueryClient } from '@tanstack/react-query';

import { reportRenderError } from '../report';
import { ErrorBoundary } from './error-boundary';

export interface IAsyncBoundaryProps {
  readonly children?: ReactNode;
  /** Что показать, пока данные грузятся. */
  readonly fallback: ReactNode;
  /** Что показать при ошибке. `retry` сбрасывает и ошибку, и упавшие запросы. */
  readonly renderError: (props: {
    readonly error: unknown;
    readonly retry: () => void;
  }) => ReactNode;
  /** Смена ключей сбрасывает ошибку, например при переходе на другую доску. */
  readonly resetKeys?: readonly unknown[];
}

/**
 * Граница загрузки и ошибок для suspense-запросов. Невизуальная: что показать,
 * решает вызывающий через `fallback` и `renderError`. Страница внутри пишет
 * только счастливый путь: `isLoading` и `error` обрабатываются здесь.
 */
export function AsyncBoundary({
  children,
  fallback,
  renderError,
  resetKeys,
}: IAsyncBoundaryProps) {
  const client = useQueryClient();
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          onError={(error, info) => {
            // Ошибки запросов уже отправил мониторинг кэша; здесь — только ошибки рендера
            const fromQuery = client
              .getQueryCache()
              .getAll()
              .some(
                (query) =>
                  query.state.status === 'error' && query.state.error === error,
              );
            if (!fromQuery)
              reportRenderError(error, info.componentStack ?? undefined);
          }}
          resetKeys={resetKeys ? [...resetKeys] : undefined}
          fallbackRender={({ error, reset: retry }) =>
            renderError({ error, retry })
          }
        >
          <Suspense fallback={fallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
