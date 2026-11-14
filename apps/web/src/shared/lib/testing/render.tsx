import type { ReactElement } from 'react';

import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import {
  type RouteObject,
  RouterProvider,
  createMemoryRouter,
} from 'react-router';

import { LocationProbe } from './LocationProbe';
import { TestProviders } from './TestProviders';

/** Без повторов и сборки мусора: тест видит ошибку сразу, кэш не пропадает между шагами. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
}

interface RenderRoutesOptions {
  readonly initialEntries?: string[];
  readonly client?: QueryClient;
}

/** Рендер настоящего дерева роутов в памяти. Неизвестный адрес показывает LocationProbe. */
export function renderRoutes(
  routes: RouteObject[],
  {
    initialEntries = ['/'],
    client = createTestQueryClient(),
  }: RenderRoutesOptions = {},
) {
  const router = createMemoryRouter(
    [...routes, { path: '*', element: <LocationProbe /> }],
    { initialEntries },
  );
  const result = render(
    <TestProviders client={client}>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return { ...result, router, client };
}

/** Один компонент на маршруте `path` с адресом `url`. */
export function renderAt(
  element: ReactElement,
  {
    path = '/',
    url = path,
    client,
  }: { path?: string; url?: string; client?: QueryClient } = {},
) {
  return renderRoutes([{ path, element }], {
    initialEntries: [url],
    ...(client ? { client } : {}),
  });
}
