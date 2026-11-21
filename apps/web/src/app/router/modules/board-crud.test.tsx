import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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
  makeBoard,
  makeBoardListItem,
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

describe('управление доской', () => {
  let api: ApiMock;

  beforeAll(() => warmUpRoutes(), 30_000);
  beforeEach(() => {
    api = setupRouterTest();
    signIn();
  });
  afterEach(() => teardownRouterTest(api));

  it('заполняет форму текущими данными и отражает сохранённое имя в доске и списке', async () => {
    let board = makeBoard({ description: 'Старое описание' });
    api
      .on('GET', '/boards/9', () => board)
      .on('GET', '/boards', () => ({
        items: [makeBoardListItem({ name: board.name })],
        total: 1,
      }))
      .on('PATCH', '/boards/9', () => {
        board = { ...board, name: 'Команда платформы', description: '' };
        return board;
      });

    const { router } = renderApp('/boards');
    fireEvent.click(await screen.findByRole('link', { name: /Разработка/ }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Редактировать доску' }),
    );
    const dialog = within(
      screen.getByRole('dialog', { name: 'Редактирование доски' }),
    );
    const name = dialog.getByLabelText('Название');
    const description = dialog.getByLabelText('Описание', { exact: false });
    const save = dialog.getByRole('button', { name: 'Сохранить' });
    expect(name).toHaveValue('Разработка');
    expect(description).toHaveValue('Старое описание');
    expect(save).toBeDisabled();
    fireEvent.change(name, { target: { value: '   ' } });
    expect(save).toBeDisabled();
    fireEvent.change(name, { target: { value: '  Команда платформы  ' } });
    fireEvent.change(description, { target: { value: '' } });
    fireEvent.click(save);

    expect(
      await screen.findByRole('heading', { name: 'Команда платформы' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.callsTo('PATCH', '/boards/9').map(({ body }) => body)).toEqual([
      { name: 'Команда платформы', description: '' },
    ]);
    await act(() => router.navigate('/boards'));
    expect(
      await screen.findByRole('link', { name: /Команда платформы/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Разработка/ })).toBeNull();
  });

  it.each(['worker', 'guest'] as const)(
    'скрывает управление для роли %s',
    async (myRole) => {
      api.on('GET', '/boards/9', makeBoard({ myRole }));
      renderApp('/boards/9');
      await screen.findByRole('heading', { name: 'Разработка' });
      expect(
        screen.queryByRole('button', { name: 'Редактировать доску' }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Удалить доску' }),
      ).toBeNull();
    },
  );

  it('при обновлении данных под открытой формой отправляет только изменённое поле', async () => {
    let board = makeBoard();
    api
      .on('GET', '/boards/9', () => board)
      .on('PATCH', '/boards/9', () => {
        board = { ...board, description: 'Новое описание' };
        return board;
      });
    const { client } = renderApp('/boards/9');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Редактировать доску' }),
    );
    board = { ...board, name: 'Другая команда' };
    act(() => {
      client.setQueryData(['board', 'detail', 9], board);
    });
    await screen.findByRole('heading', { name: 'Другая команда' });

    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Описание', { exact: false }), {
      target: { value: 'Новое описание' },
    });
    fireEvent.click(dialog.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.callsTo('PATCH', '/boards/9').map(({ body }) => body)).toEqual([
      { description: 'Новое описание' },
    ]);
  });

  it('удаляет только после подтверждения, очищает кэш и возвращает к списку', async () => {
    let deleted = false;
    api
      .on('GET', '/boards', () =>
        deleted
          ? { items: [], total: 0 }
          : { items: [makeBoardListItem()], total: 1 },
      )
      .on('DELETE', '/boards/9', () => {
        deleted = true;
        return new Response(null, { status: 204 });
      });
    const { client, router } = renderApp('/boards');
    fireEvent.click(await screen.findByRole('link', { name: /Разработка/ }));
    const remove = await screen.findByRole('button', { name: 'Удалить доску' });
    const task = makeTaskDetail({ key: 'GWT-101' });
    const taskQueryKey = ['task', 'detail', task.key];
    client.setQueryData(taskQueryKey, task);
    const storageKey = `mini-jira:${users.anna.id}:current-board`;
    await waitFor(() => expect(localStorage.getItem(storageKey)).toBe('9'));

    fireEvent.click(remove);
    expect(
      screen.getByRole('dialog', { name: 'Удалить доску?' }),
    ).toHaveAccessibleDescription(/Разработка.*без возможности восстановления/);
    const dialog = () =>
      within(screen.getByRole('dialog', { name: /Удалить доску/ }));
    fireEvent.click(dialog().getByRole('button', { name: 'Отмена' }));
    expect(api.callsTo('DELETE', '/boards/9')).toHaveLength(0);
    fireEvent.click(remove);
    fireEvent.click(dialog().getByRole('button', { name: 'Удалить' }));

    expect(await screen.findByText('Досок пока нет')).toBeInTheDocument();
    expect(api.callsTo('DELETE', '/boards/9')).toHaveLength(1);
    expect(router.state.location.pathname).toBe('/boards');
    await waitFor(() => {
      expect(client.getQueryData(['board', 'detail', 9])).toBeUndefined();
      expect(client.getQueryData(['task', 'board', 9])).toBeUndefined();
      expect(client.getQueryData(taskQueryKey)).toBeUndefined();
      expect(localStorage.getItem(storageKey)).toBeNull();
    });
  });

  it('показывает ошибку удаления и оставляет пользователя на доске', async () => {
    api.on(
      'DELETE',
      '/boards/9',
      apiError('ROLE_FORBIDDEN', 'Право удалять доску отозвано'),
      { status: 403 },
    );
    const { router } = renderApp('/boards/9');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Удалить доску' }),
    );
    const dialog = within(
      screen.getByRole('dialog', { name: /Удалить доску/ }),
    );
    fireEvent.click(dialog.getByRole('button', { name: 'Удалить' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'Право удалять доску отозвано',
    );
    expect(router.state.location.pathname).toBe('/boards/9');
    expect(dialog.getByRole('button', { name: 'Удалить' })).toBeEnabled();
  });
});
