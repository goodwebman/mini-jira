import type { RouteObject } from 'react-router';
import { expect, vi } from 'vitest';

import { configureApiTransport } from '@/shared/api';
import {
  type ApiMock,
  createApiMock,
  makeBoard,
  makeBoardTasks,
  makeNavSummary,
  makeTask,
  renderRoutes,
} from '@/shared/lib/testing';

import { routes } from '../routes';
import { resetAuth } from './auth-mock';

/**
 * Общий сценарий интеграционных тестов: сессия сброшена, хранилища чисты,
 * API отвечает доской 9 (две задачи) и пустой доской 11. Тест дополняет
 * или переопределяет ответы — позже добавленный обработчик главнее.
 */
export function setupRouterTest(): ApiMock {
  vi.stubEnv('VITE_API_URL', '/api/v1');
  resetAuth();
  sessionStorage.clear();
  localStorage.clear();
  const api = createApiMock()
    .on('GET', '/me/nav-summary', makeNavSummary())
    .on('GET', '/boards', { items: [], total: 0 })
    .on('GET', '/boards/9', makeBoard())
    .on(
      'GET',
      '/boards/9/tasks',
      makeBoardTasks([
        makeTask({ key: 'GWT-101', title: 'Экран входа', status: 'todo' }),
        makeTask({ key: 'GWT-102', title: 'График KPI', status: 'work' }),
      ]),
    )
    .on(
      'GET',
      '/boards/11',
      makeBoard({ id: 11, key: 'FRONT', name: 'Фронтенд' }),
    )
    .on('GET', '/boards/11/tasks', makeBoardTasks([]))
    .on('GET', '/users/search', { items: [] });
  configureApiTransport(api.fetch);
  return api;
}

/** Запрос без мока молча получил бы 501: тест должен знать обо всех запросах. */
export function teardownRouterTest(api: ApiMock): void {
  vi.unstubAllEnvs();
  expect(api.unmatched).toEqual([]);
}

export function renderApp(url: string) {
  return renderRoutes(routes, { initialEntries: [url] });
}

/**
 * Загружает все ленивые страницы заранее. Каждый тестовый файл — свой граф
 * модулей, и без прогрева первая страница транспилируется прямо внутри
 * `findBy*`: таймаут мерил бы vite, а не поведение. Подключается в `beforeAll`.
 */
export async function warmUpRoutes(
  tree: RouteObject[] = routes,
): Promise<void> {
  await Promise.all(
    tree.map(async (route) => {
      if (typeof route.lazy === 'function') await route.lazy();
      if (route.children) await warmUpRoutes(route.children);
    }),
  );
}
