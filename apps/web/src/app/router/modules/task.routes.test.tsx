/**
 * Модуль задачи на настоящем дереве роутов.
 *
 * Тесткейсы: постоянная ссылка ведёт в скоуп доски задачи; страница по ролям — администратор правит
 * и ставит запрет, ревьювер возвращает в работу, рабочий видит запрет, гость только смотрит.
 */
import { screen, waitFor, within } from '@testing-library/react';
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
  makeBoard,
  makeTaskDetail,
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

describe('постоянная ссылка', () => {
  beforeEach(signIn);

  it('постоянная ссылка на задачу ведёт в скоуп её доски', async () => {
    api.on(
      'GET',
      '/tasks/GWT-101',
      makeTaskDetail({ key: 'GWT-101', title: 'Экран входа' }),
    );
    const { router } = renderApp('/tasks/GWT-101');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/boards/9/tasks/GWT-101'),
    );
    expect(
      await screen.findByRole('heading', { name: 'Экран входа' }),
    ).toBeInTheDocument();
  });
});

describe('страница задачи по ролям', () => {
  beforeEach(signIn);

  const openTask = (patch: Parameters<typeof makeTaskDetail>[0]) => {
    api.on(
      'GET',
      '/tasks/GWT-101',
      makeTaskDetail({ key: 'GWT-101', title: 'Экран входа', ...patch }),
    );
    renderApp('/boards/9/tasks/GWT-101');
    return screen.findByRole('heading', { name: 'Экран входа' });
  };

  it('администратор правит свойства и ставит запрет', async () => {
    await openTask({ myRole: 'admin', status: 'todo' });
    expect(
      screen.getByRole('checkbox', { name: 'Запретить брать в работу' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Приоритет')).toHaveValue('med');
    expect(screen.getByLabelText('Статус')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Связать/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Новый комментарий')).toBeInTheDocument();
  });

  it('рабочий-ревьювер может вернуть задачу в работу, но не править свойства', async () => {
    await openTask({
      myRole: 'worker',
      status: 'review',
      isTakeLocked: false,
      people: {
        author: users.ivan,
        reviewer: users.anna,
        tester: null,
        designer: null,
      },
    });
    const status = screen.getByLabelText('Статус');
    expect(
      within(status)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['В работе', 'Ревью', 'Тестирование', 'Готово']);
    expect(screen.queryByLabelText('Приоритет')).toBeNull();
    expect(
      within(
        screen.getByRole('complementary', { name: 'Свойства задачи' }),
      ).getByText('Средний'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Запретить брать в работу' }),
    ).toBeNull();
  });

  it('рабочий видит запрет, но не может его снять', async () => {
    await openTask({ myRole: 'worker', status: 'todo', isTakeLocked: true });
    expect(
      screen.getAllByText('Администратор запретил брать задачу в работу')
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole('checkbox', { name: 'Запретить брать в работу' }),
    ).toBeNull();
  });

  it('гость только смотрит', async () => {
    api.on('GET', '/boards/9', makeBoard({ myRole: 'guest' }));
    await openTask({ myRole: 'guest', status: 'work' });
    expect(
      screen.getByText('Вы гость на этой доске: можно только смотреть'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Статус')).toBeNull();
    expect(screen.queryByRole('button', { name: /Связать/ })).toBeNull();
    expect(screen.queryByLabelText('Новый комментарий')).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Поставить на паузу/ }),
    ).toBeNull();
  });
});
