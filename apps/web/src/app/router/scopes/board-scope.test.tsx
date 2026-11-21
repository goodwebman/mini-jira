/**
 * Cross-module scope доски на настоящем дереве роутов.
 *
 * Тесткейсы: фильтры переживают переходы и обновление, изолированы по доске и пользователю;
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
  makeMe,
  makeMember,
  makeSprintKpi,
  makeTask,
  makeTaskDetail,
  users,
} from '@/shared/lib/testing';

import { auth, signIn } from '../testing/auth-mock';
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

  it('сохраняет фильтры после ухода в KPI и возврата', async () => {
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
    ).toHaveValue('вход');
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

describe('сохранение фильтров доски', () => {
  const first = makeTask({
    key: 'GWT-101',
    title: 'Экран входа',
    priority: 'high',
  });
  const second = makeTask({
    key: 'GWT-102',
    title: 'Экран отчёта',
    priority: 'high',
    people: {
      author: users.elena,
      reviewer: users.anna,
      tester: null,
      designer: null,
    },
  });
  const third = makeTask({ key: 'GWT-103', title: 'Сервис', priority: 'med' });
  const params = new URLSearchParams({
    q: 'Экран',
    priority: 'high',
    assignee: users.ivan.id,
  });
  const chips = () =>
    within(screen.getByRole('group', { name: 'Фильтр по участникам' }));

  beforeEach(() => {
    signIn();
    api.on('GET', '/boards/9/tasks', makeBoardTasks([first, second, third]));
    api.on('GET', '/tasks/GWT-101', makeTaskDetail(first));
  });

  it('восстанавливает поиск, приоритет и участников после обновления страницы', async () => {
    const app = renderApp('/boards/9?view=compact');
    fireEvent.change(
      await screen.findByLabelText('Поиск по названию или ключу'),
      { target: { value: 'Экран' } },
    );
    fireEvent.change(screen.getByLabelText('Приоритет'), {
      target: { value: 'high' },
    });
    fireEvent.click(chips().getByRole('button', { name: /Иван/ }));
    await waitFor(() =>
      expect(screen.queryByText(second.title)).not.toBeInTheDocument(),
    );
    expect(screen.getByText(first.title)).toBeInTheDocument();
    fireEvent.click(chips().getByRole('button', { name: /Елена/ }));
    expect(await screen.findByText(second.title)).toBeInTheDocument();
    expect(app.router.state.location.search).toBe('?view=compact');
    app.unmount();
    app.router.dispose();
    renderApp('/boards/9?view=compact');
    expect(
      await screen.findByLabelText('Поиск по названию или ключу'),
    ).toHaveValue('Экран');
    expect(screen.getByLabelText('Приоритет')).toHaveValue('high');
    expect(chips().getByRole('button', { name: /Иван/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(chips().getByRole('button', { name: /Елена/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await screen.findByText(first.title)).toBeInTheDocument();
    expect(screen.getByText(second.title)).toBeInTheDocument();
    expect(screen.queryByText(third.title)).not.toBeInTheDocument();
  });

  it('игнорирует неверный приоритет и чужих участников из старой ссылки', async () => {
    renderApp('/boards/9?priority=invalid&assignee=missing');
    expect(await screen.findByLabelText('Приоритет')).toHaveValue('all');
    expect(chips().getByRole('button', { name: 'Все' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await screen.findByText(first.title)).toBeInTheDocument();
    expect(screen.getByText(second.title)).toBeInTheDocument();
    expect(screen.getByText(third.title)).toBeInTheDocument();
  });

  it('восстанавливает 200 выбранных участников из короткого адреса доски', async () => {
    const members = Array.from({ length: 199 }, (_, index) =>
      makeMember({
        ...users.elena,
        id: crypto.randomUUID(),
        name: `Участник ${index + 1}`,
      }),
    );
    members.push(makeMember(users.ivan));
    api.on('GET', '/boards/9', makeBoard({ members }));
    const legacy = new URLSearchParams();
    for (const member of members) legacy.append('assignee', member.id);
    legacy.append('assignee', users.ivan.id);

    const app = renderApp(`/boards/9?${legacy}`);
    expect(await screen.findByText(first.title)).toBeInTheDocument();
    expect(chips().getAllByRole('button', { pressed: true })).toHaveLength(200);
    expect(app.router.state.location.search).toBe('');
    app.unmount();
    app.router.dispose();

    renderApp('/boards/9');
    expect(await screen.findByText(first.title)).toBeInTheDocument();
    expect(chips().getAllByRole('button', { pressed: true })).toHaveLength(200);
    expect(screen.queryByText(second.title)).not.toBeInTheDocument();
  });

  it('переносит фильтры старой ссылки в стор и сохраняет остальные параметры', async () => {
    const { router } = renderApp(`/boards/9?${params}&view=compact#section`);
    await screen.findByLabelText('Приоритет');
    expect(router.state.location.search).toBe('?view=compact');
    expect(router.state.location.hash).toBe('#section');
    fireEvent.click(screen.getByRole('link', { name: /Участники · 4/ }));
    await screen.findByRole('heading', { name: 'Участники доски' });
    expect(router.state.location.search).toBe('?view=compact');
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    expect(await screen.findByLabelText('Приоритет')).toHaveValue('high');
    expect(chips().getByRole('button', { name: /Иван/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await screen.findByText(first.title)).toBeInTheDocument();
    expect(screen.queryByText(second.title)).not.toBeInTheDocument();
  });

  it('восстанавливает фильтры при возврате после обновления страницы задачи', async () => {
    const app = renderApp(`/boards/9?${params}`);
    const card = await screen.findByRole('link', { name: /Экран входа/ });
    expect(card).toHaveAttribute('href', '/boards/9/tasks/GWT-101');
    fireEvent.click(card);
    await screen.findByRole('heading', { name: first.title });
    const url =
      app.router.state.location.pathname + app.router.state.location.search;
    app.unmount();
    app.router.dispose();
    const refreshed = renderApp(url);
    await screen.findByRole('heading', { name: first.title });
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    expect(
      await screen.findByLabelText('Поиск по названию или ключу'),
    ).toHaveValue('Экран');
    expect(screen.getByLabelText('Приоритет')).toHaveValue('high');
    expect(refreshed.router.state.location.search).toBe('');
    expect(chips().getByRole('button', { name: /Иван/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('другой пользователь получает собственные фильтры той же доски', async () => {
    const app = renderApp(`/boards/9?${params}`);
    expect(await screen.findByLabelText('Приоритет')).toHaveValue('high');
    app.unmount();
    app.router.dispose();
    auth.state.user = makeMe({ id: users.ivan.id });
    renderApp('/boards/9');
    expect(await screen.findByLabelText('Приоритет')).toHaveValue('all');
    expect(await screen.findByText(third.title)).toBeInTheDocument();
  });

  it('открывает старую ссылку на задачу с фильтрами для возврата на доску', async () => {
    const { router } = renderApp(`/boards/9/tasks/GWT-101?${params}`);
    await screen.findByRole('heading', { name: first.title });
    expect(router.state.location.search).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    expect(
      await screen.findByLabelText('Поиск по названию или ключу'),
    ).toHaveValue('Экран');
    expect(screen.getByLabelText('Приоритет')).toHaveValue('high');
    expect(chips().getByRole('button', { name: /Иван/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('сброс фильтров возвращает все карточки и сохраняется при обновлении', async () => {
    const { router } = renderApp(`/boards/9?${params}&view=compact`);
    fireEvent.change(
      await screen.findByLabelText('Поиск по названию или ключу'),
      { target: { value: '' } },
    );
    fireEvent.change(screen.getByLabelText('Приоритет'), {
      target: { value: 'all' },
    });
    fireEvent.click(chips().getByRole('button', { name: 'Все' }));
    await waitFor(() =>
      expect(router.state.location.search).toBe('?view=compact'),
    );
    expect(await screen.findByText(first.title)).toBeInTheDocument();
    expect(screen.getByText(second.title)).toBeInTheDocument();
    expect(screen.getByText(third.title)).toBeInTheDocument();
    expect(
      localStorage.getItem(`mini-jira:${users.anna.id}:board:9:filters`),
    ).toBeNull();
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
