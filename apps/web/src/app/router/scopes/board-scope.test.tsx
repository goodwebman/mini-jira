/**
 * Cross-module scope доски на настоящем дереве роутов.
 *
 * Тесткейсы: фильтры переживают «доска → участники → назад»; другая доска и уход в KPI дают чистый стор;
 * удалённый или ставший гостем человек пропадает из фильтра; пауза с карточки; гость видит плашку и не видит действий.
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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
  makeBoardTasks,
  makeMember,
  makeSprintKpi,
  makeTask,
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

describe('cross-module scope доски', () => {
  beforeEach(signIn);

  it('фильтры переживают переход к участникам и обратно', async () => {
    renderApp('/boards/9');
    const search = await screen.findByLabelText('Поиск по названию или ключу');
    fireEvent.change(search, { target: { value: 'вход' } });
    expect(await screen.findByText('Экран входа')).toBeInTheDocument();
    expect(screen.queryByText('График KPI')).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: /Участники · 4/ }));
    expect(
      await screen.findByRole('heading', { name: 'Участники доски' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));

    expect(
      await screen.findByLabelText('Поиск по названию или ключу'),
    ).toHaveValue('вход');
    expect(screen.queryByText('График KPI')).toBeNull();
  });

  it('другая доска получает свой чистый стор', async () => {
    const { router } = renderApp('/boards/9');
    fireEvent.change(
      await screen.findByLabelText('Поиск по названию или ключу'),
      {
        target: { value: 'вход' },
      },
    );
    await router.navigate('/boards/11');
    expect(
      await screen.findByRole('heading', { name: 'Фронтенд' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Поиск по названию или ключу')).toHaveValue(
      '',
    );
  });

  it('удалённый на экране участников человек пропадает из фильтра доски', async () => {
    api.on('DELETE', `/boards/9/members/${users.ivan.id}`, undefined, {
      status: 204,
    });
    renderApp('/boards/9');
    const chips = await screen.findByRole('group', {
      name: 'Фильтр по участникам',
    });
    fireEvent.click(within(chips).getByRole('button', { name: /Иван/ }));
    expect(within(chips).getByRole('button', { name: /Иван/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('link', { name: /Участники · 4/ }));

    // После DELETE сервер отдаёт доску уже без Ивана
    api.on(
      'GET',
      '/boards/9',
      makeBoard({
        members: [
          makeMember(users.anna, 'admin'),
          makeMember(users.elena),
          makeMember(users.viktoria, 'guest'),
        ],
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Убрать: Иван Петров' }),
    );
    await waitFor(() =>
      expect(
        api.callsTo('DELETE', `/boards/9/members/${users.ivan.id}`),
      ).toHaveLength(1),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    const after = await screen.findByRole('group', {
      name: 'Фильтр по участникам',
    });
    await waitFor(() =>
      expect(
        within(after).getByRole('button', { name: 'Все' }),
      ).toHaveAttribute('aria-pressed', 'true'),
    );
  });
});

describe('скоуп доски: границы', () => {
  beforeEach(signIn);

  it('уход в KPI и возврат дают чистые фильтры', async () => {
    api
      .on('GET', '/boards/9/sprints/14/kpi', makeSprintKpi())
      .on('GET', '/boards/9/sprints', { items: [] });
    const { router } = renderApp('/boards/9');
    fireEvent.change(
      await screen.findByLabelText('Поиск по названию или ключу'),
      { target: { value: 'вход' } },
    );
    await router.navigate('/kpi?board=9&sprint=14');
    expect(await screen.findByText('Сгорание спринта, SP')).toBeInTheDocument();
    await router.navigate('/boards/9');
    expect(
      await screen.findByLabelText('Поиск по названию или ключу'),
    ).toHaveValue('');
  });

  it('человек, ставший гостем, пропадает из фильтра доски', async () => {
    api
      .on('PATCH', `/boards/9/members/${users.ivan.id}`, {
        ...makeMember(users.ivan, 'guest'),
      })
      .on(
        'GET',
        '/boards/9',
        makeBoard({
          members: [
            makeMember(users.anna, 'admin'),
            makeMember(users.ivan, 'guest'),
            makeMember(users.elena),
          ],
        }),
        { once: false },
      );
    // Первый ответ доски — ещё с Иваном-рабочим
    api.on('GET', '/boards/9', makeBoard(), { once: true });
    renderApp('/boards/9');
    const chips = await screen.findByRole('group', {
      name: 'Фильтр по участникам',
    });
    fireEvent.click(within(chips).getByRole('button', { name: /Иван/ }));

    fireEvent.click(screen.getByRole('link', { name: /Участники · 4/ }));
    fireEvent.change(await screen.findByLabelText('Роль: Иван Петров'), {
      target: { value: 'guest' },
    });
    await waitFor(() =>
      expect(
        api.callsTo('PATCH', `/boards/9/members/${users.ivan.id}`),
      ).toHaveLength(1),
    );
    // Гостю роль менять можно и дальше: селект остаётся, меняется значение.
    // Ждём перезапрос доски после мутации — в нём Иван уже гость.
    await waitFor(() =>
      expect(screen.getByLabelText('Роль: Иван Петров')).toHaveValue('guest'),
    );
    await waitFor(() =>
      expect(api.callsTo('GET', '/boards/9').length).toBeGreaterThan(1),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));

    const after = await screen.findByRole('group', {
      name: 'Фильтр по участникам',
    });
    expect(within(after).queryByRole('button', { name: /Иван/ })).toBeNull();
    expect(within(after).getByRole('button', { name: 'Все' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('действия на доске', () => {
  beforeEach(signIn);

  it('пауза с карточки уходит на сервер и меняет таймер', async () => {
    const working = makeTask({
      key: 'GWT-102',
      title: 'График KPI',
      status: 'work',
    });
    api.on(
      'GET',
      '/boards/9/tasks',
      makeBoardTasks([working], { serverTime: new Date().toISOString() }),
    );
    api.on('POST', '/tasks/GWT-102/pause', {
      ...working,
      timer: { ...working.timer, pausedAt: new Date().toISOString() },
    });
    renderApp('/boards/9');
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Поставить на паузу: GWT-102',
      }),
    );
    expect(await screen.findByText(/На паузе/)).toBeInTheDocument();
    expect(api.callsTo('POST', '/tasks/GWT-102/pause')).toHaveLength(1);
  });

  it('гость видит плашку и не видит действий', async () => {
    api.on('GET', '/boards/9', makeBoard({ myRole: 'guest' }));
    renderApp('/boards/9');
    expect(
      await screen.findByText('Вы гость на этой доске: можно только смотреть'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Создать задачу' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Добавить задачу/ }),
    ).toBeNull();
  });
});
