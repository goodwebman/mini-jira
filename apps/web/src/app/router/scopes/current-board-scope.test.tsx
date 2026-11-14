/** Global scope текущей доски: недоступная доска забывается, сводка меню строится без неё. */
import { waitFor } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  type ApiMock,
  apiError,
  makeMyTasks,
  users,
} from '@/shared/lib/testing';

import { signIn } from '../testing/auth-mock';
import {
  renderApp,
  setupRouterTest,
  teardownRouterTest,
  warmUpRoutes,
} from '../testing/router-harness';

vi.mock(
  '@/entities/auth',
  async () => (await import('../testing/auth-mock')).authModule,
);

let api: ApiMock;

beforeAll(() => warmUpRoutes(), 30_000);

beforeEach(() => {
  api = setupRouterTest();
});
afterEach(() => teardownRouterTest(api));

describe('текущая доска', () => {
  beforeEach(signIn);

  it('недоступная текущая доска забывается, сводка строится без неё', async () => {
    const key = `mini-jira:${users.anna.id}:current-board`;
    localStorage.setItem(key, '77');
    api.on(
      'GET',
      /^\/me\/nav-summary\?boardId=77$/,
      apiError('NOT_BOARD_MEMBER'),
      {
        status: 403,
      },
    );
    renderApp('/my-tasks');
    api.on('GET', '/me/tasks', makeMyTasks([]));
    await waitFor(() => expect(localStorage.getItem(key)).toBeNull());
    await waitFor(() =>
      expect(
        api.calls.some(
          (call) =>
            call.path === '/me/nav-summary' && !call.search.has('boardId'),
        ),
      ).toBe(true),
    );
  });
});
