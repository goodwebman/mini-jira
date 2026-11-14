/**
 * Тесткейсы диалога задачи:
 * - рабочий видит статус «К работе» текстом, автор по умолчанию — он сам, гостей нет в списках;
 * - валидация до сети; тело запроса по контракту; карточка попадает в кэш доски, тост с ключом;
 * - ошибки полей с сервера показываются под полями.
 */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { taskQueryKeys } from '@/entities/task';
import { configureApiTransport } from '@/shared/api';
import {
  type ApiMock,
  TestProviders,
  apiError,
  createApiMock,
  createTestQueryClient,
  makeBoard,
  makeBoardListItem,
  makeBoardTasks,
  makeTask,
  users,
} from '@/shared/lib/testing';

import { CreateTaskDialog } from './CreateTaskDialog';

let api: ApiMock;
const client = createTestQueryClient();

const open = (onOpenChange = vi.fn()) =>
  render(
    <TestProviders client={client}>
      <CreateTaskDialog
        open
        onOpenChange={onOpenChange}
        boardId={9}
        initialStatus='review'
        currentUserId={users.ivan.id}
      />
    </TestProviders>,
  );

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', '/api/v1');
  client.clear();
  api = createApiMock()
    .on('GET', '/boards', {
      items: [makeBoardListItem({ myRole: 'worker' })],
      total: 1,
    })
    .on('GET', '/boards/9', makeBoard({ myRole: 'worker' }));
  configureApiTransport(api.fetch);
  client.setQueryData(taskQueryKeys.board(9), makeBoardTasks([]));
});

describe('CreateTaskDialog', () => {
  it('рабочий: статус фиксирован, автор — он сам, гостей нельзя назначить', async () => {
    open();
    const dialog = await screen.findByRole('dialog', { name: 'Новая задача' });
    expect(within(dialog).getByText('К работе')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(dialog).getByLabelText('Автор')).toHaveValue(users.ivan.id),
    );
    const reviewers = within(
      within(dialog).getByLabelText('Ревьювер'),
    ).getAllByRole('option');
    expect(reviewers.map((option) => option.textContent)).not.toContain(
      users.viktoria.name,
    );
  });

  it('проверяет поля до сети, потом создаёт задачу в «К работе»', async () => {
    const created = makeTask({ key: 'GWT-700', status: 'todo' });
    api.on('POST', '/boards/9/tasks', created);
    const onOpenChange = vi.fn();
    open(onOpenChange);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(within(dialog).getByLabelText('Автор')).toHaveValue(users.ivan.id),
    );

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Создать задачу' }),
    );
    expect(
      await within(dialog).findByText('Введите название'),
    ).toBeInTheDocument();
    expect(
      within(dialog)
        .getAllByRole('alert')
        .map((alert) => alert.textContent),
    ).toEqual(
      expect.arrayContaining(['Введите название', 'Выберите ревьювера']),
    );
    expect(api.callsTo('POST', '/boards/9/tasks')).toHaveLength(0);

    fireEvent.change(within(dialog).getByLabelText('Название'), {
      target: { value: 'Экран входа' },
    });
    fireEvent.change(within(dialog).getByLabelText('Оценка, SP'), {
      target: { value: '3' },
    });
    fireEvent.change(within(dialog).getByLabelText('Ревьювер'), {
      target: { value: users.anna.id },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Создать задачу' }),
    );

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(api.callsTo('POST', '/boards/9/tasks')[0]?.body).toMatchObject({
      title: 'Экран входа',
      status: 'todo',
      sp: 3,
      authorId: users.ivan.id,
      reviewerId: users.anna.id,
    });
    expect(
      client.getQueryData<{ items: { key: string }[] }>(taskQueryKeys.board(9))
        ?.items[0]?.key,
    ).toBe('GWT-700');
    expect(
      await screen.findByText('Задача GWT-700 создана'),
    ).toBeInTheDocument();
  });

  it('ошибки полей с сервера показываются под полями', async () => {
    api.on(
      'POST',
      '/boards/9/tasks',
      apiError('ASSIGNEE_IS_GUEST', 'Гостя нельзя назначить', {
        reviewerId: 'Этот человек теперь гость',
      }),
      { status: 422 },
    );
    open();
    const dialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(within(dialog).getByLabelText('Автор')).toHaveValue(users.ivan.id),
    );
    fireEvent.change(within(dialog).getByLabelText('Название'), {
      target: { value: 'Задача' },
    });
    fireEvent.change(within(dialog).getByLabelText('Оценка, SP'), {
      target: { value: '1' },
    });
    fireEvent.change(within(dialog).getByLabelText('Ревьювер'), {
      target: { value: users.anna.id },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Создать задачу' }),
    );
    expect(
      await within(dialog).findByText('Этот человек теперь гость'),
    ).toBeInTheDocument();
  });

  it('администратор выбирает статус, и он уходит в запрос', async () => {
    api
      .on('GET', '/boards', { items: [makeBoardListItem()], total: 1 })
      .on('GET', '/boards/9', makeBoard({ myRole: 'admin' }))
      .on(
        'POST',
        '/boards/9/tasks',
        makeTask({ key: 'GWT-701', status: 'review' }),
      );
    open();
    const dialog = await screen.findByRole('dialog');
    const status = await within(dialog).findByLabelText('Статус');
    expect(status).toHaveValue('review');
    fireEvent.change(status, { target: { value: 'test' } });
    fireEvent.change(within(dialog).getByLabelText('Название'), {
      target: { value: 'Админская' },
    });
    fireEvent.change(within(dialog).getByLabelText('Оценка, SP'), {
      target: { value: '2' },
    });
    fireEvent.change(within(dialog).getByLabelText('Ревьювер'), {
      target: { value: users.anna.id },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Создать задачу' }),
    );
    await waitFor(() =>
      expect(api.callsTo('POST', '/boards/9/tasks')[0]?.body).toMatchObject({
        status: 'test',
      }),
    );
  });

  it('текущая доска, где пользователь гость, не подставляется: берётся первая доступная', async () => {
    api
      .on('GET', '/boards', {
        items: [
          makeBoardListItem({ id: 9, myRole: 'guest' }),
          makeBoardListItem({
            id: 11,
            key: 'FRONT',
            name: 'Фронтенд',
            myRole: 'worker',
          }),
        ],
        total: 2,
      })
      .on(
        'GET',
        '/boards/11',
        makeBoard({ id: 11, key: 'FRONT', name: 'Фронтенд', myRole: 'worker' }),
      )
      .on(
        'POST',
        '/boards/11/tasks',
        makeTask({ key: 'FRONT-1', boardId: 11 }),
      );
    open();
    const dialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(within(dialog).getByLabelText('Доска')).toHaveValue('11'),
    );
    await waitFor(() =>
      expect(within(dialog).getByLabelText('Автор')).toHaveValue(users.ivan.id),
    );
    fireEvent.change(within(dialog).getByLabelText('Название'), {
      target: { value: 'Задача' },
    });
    fireEvent.change(within(dialog).getByLabelText('Оценка, SP'), {
      target: { value: '1' },
    });
    fireEvent.change(within(dialog).getByLabelText('Ревьювер'), {
      target: { value: users.anna.id },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Создать задачу' }),
    );
    await waitFor(() =>
      expect(api.callsTo('POST', '/boards/11/tasks')).toHaveLength(1),
    );
    expect(api.callsTo('POST', '/boards/9/tasks')).toHaveLength(0);
  });
});
