/**
 * Модуль задачи на настоящем дереве роутов.
 *
 * Тесткейсы: постоянная ссылка ведёт в скоуп доски задачи; страница по ролям — администратор правит
 * и ставит запрет, ревьювер возвращает в работу, рабочий видит запрет, гость только смотрит.
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

  it('ссылка на комментарий сохраняет якорь после перехода в доску', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    api.on(
      'GET',
      '/tasks/GWT-101',
      makeTaskDetail({
        key: 'GWT-101',
        comments: [
          {
            id,
            parentId: null,
            author: users.anna,
            text: 'Комментарий по ссылке',
            createdAt: '2026-11-11T00:00:00Z',
          },
        ],
      }),
    );
    const { router } = renderApp(`/tasks/GWT-101#comment-${id}`);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/boards/9/tasks/GWT-101'),
    );
    expect(router.state.location.hash).toBe(`#comment-${id}`);
    await waitFor(() =>
      expect(document.getElementById(`comment-${id}`)).toHaveAttribute(
        'data-highlighted',
        'true',
      ),
    );
    expect(scrollIntoView).toHaveBeenCalled();
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  });

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
    expect(
      screen.getByRole('button', { name: 'Редактировать задачу' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Удалить задачу' }),
    ).toBeInTheDocument();
  });

  it('после удаления возвращается на доску без удалённой задачи', async () => {
    api
      .on('GET', '/tasks/GWT-101', makeTaskDetail({ key: 'GWT-101' }))
      .on('DELETE', '/tasks/GWT-101', undefined, { status: 204 })
      .on('GET', '/boards/9/tasks', makeBoardTasks([]));
    const { router, client } = renderApp('/boards/9/tasks/GWT-101');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Удалить задачу' }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Удалить',
      }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/boards/9'),
    );
    expect(client.getQueryData(['task', 'detail', 'GWT-101'])).toBeUndefined();
    expect(api.callsTo('DELETE', '/tasks/GWT-101')).toHaveLength(1);
  });

  it('сохраняет название и описание через форму и показывает обновлённую задачу', async () => {
    const task = makeTaskDetail({ key: 'GWT-101' });
    const updated = {
      ...task,
      title: 'Новое название',
      description: 'Новое описание',
    };
    api.on('GET', '/tasks/GWT-101', task).on('PATCH', '/tasks/GWT-101', () => {
      api.on('GET', '/tasks/GWT-101', updated);
      return updated;
    });
    renderApp('/boards/9/tasks/GWT-101');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Редактировать задачу' }),
    );
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Название'), {
      target: { value: updated.title },
    });
    fireEvent.change(dialog.getByLabelText(/^Описание/), {
      target: { value: updated.description },
    });
    fireEvent.click(dialog.getByRole('button', { name: 'Сохранить' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByRole('heading', { name: updated.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(updated.description)).toBeInTheDocument();
    expect(api.callsTo('PATCH', '/tasks/GWT-101')[0]?.body).toEqual({
      title: updated.title,
      description: updated.description,
    });
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
      screen.queryByRole('button', { name: 'Редактировать задачу' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Удалить задачу' })).toBeNull();
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
    expect(
      screen.queryByRole('button', { name: 'Редактировать задачу' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Удалить задачу' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Связать/ })).toBeNull();
    expect(screen.queryByLabelText('Новый комментарий')).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Поставить на паузу/ }),
    ).toBeNull();
  });
});
