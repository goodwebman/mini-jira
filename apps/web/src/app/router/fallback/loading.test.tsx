import { act, screen, waitFor } from '@testing-library/react';
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
  makeBoardTasks,
  makeMe,
  makeTask,
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
  signIn();
});
afterEach(() => teardownRouterTest(api));

describe('независимая загрузка блоков', () => {
  it('доска показывает шапку и фильтры, пока задачи ещё загружаются', async () => {
    let finish!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    api.on('GET', '/boards/9/tasks', () => pending);
    renderApp('/boards/9');
    expect(
      await screen.findByRole('heading', { name: 'Разработка' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Поиск по названию или ключу')).toBeEnabled();
    expect(screen.getByLabelText('Загрузка задач')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(
      screen.getAllByRole('link', { name: 'Мои задачи' }).length,
    ).toBeGreaterThan(0);
    await act(async () => {
      finish(makeBoardTasks([makeTask({ title: 'Загруженная задача' })]));
    });
    expect(await screen.findByText('Загруженная задача')).toBeInTheDocument();
    expect(screen.queryByLabelText('Загрузка задач')).toBeNull();
  });

  it('профиль не ждёт статистику для показа формы', async () => {
    let finish!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    api.on('GET', '/me', makeMe()).on('GET', '/me/task-stats', () => pending);
    const { container } = renderApp('/profile');
    expect(await screen.findByLabelText('Имя и фамилия')).toHaveValue(
      makeMe().name,
    );
    expect(screen.getByLabelText('Текущий пароль')).toBeEnabled();
    expect(
      container.querySelector('[data-name="UISkeleton"]'),
    ).toBeInTheDocument();
    await act(async () => {
      finish({ open: 0, closed: 0, totalSp: 0, nextOpen: [] });
    });
    await waitFor(() =>
      expect(container.querySelector('[data-name="UISkeleton"]')).toBeNull(),
    );
  });
});
