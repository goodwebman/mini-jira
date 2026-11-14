/** Модуль KPI: без адреса берётся первая доска и её текущий спринт, выбор пишется в адрес. */
import { screen, waitFor } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { type ApiMock, makeSprintKpi } from '@/shared/lib/testing';

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

describe('KPI по умолчанию', () => {
  beforeEach(signIn);

  it('KPI без адреса берёт первую доску и её текущий спринт', async () => {
    api
      .on('GET', '/boards', {
        items: [
          {
            id: 9,
            key: 'GWT',
            name: 'Разработка',
            colorIndex: 0,
            isFavorite: false,
            memberCount: 4,
            myRole: 'admin',
            membersPreview: [],
            currentSprintNumber: 14,
          },
        ],
        total: 1,
      })
      .on('GET', '/boards/9/sprints/14/kpi', makeSprintKpi());
    const { router } = renderApp('/kpi');
    await waitFor(() =>
      expect(router.state.location.search).toBe('?board=9&sprint=14'),
    );
    expect(await screen.findByText('Сгорание спринта, SP')).toBeInTheDocument();
  });
});
