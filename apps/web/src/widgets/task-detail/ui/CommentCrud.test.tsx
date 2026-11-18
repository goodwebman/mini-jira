import type { BoardRole, TaskComment } from '@gwmt/contracts';
import { useQuery } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { taskQueryKeys, taskQueryOptions } from '@/entities/task';
import { configureApiTransport } from '@/shared/api';
import {
  TestProviders,
  apiError,
  createApiMock,
  createTestQueryClient,
  makeBoard,
  makeTaskDetail,
  users,
} from '@/shared/lib/testing';

import { TaskCommentsCard } from './TaskCommentsCard';

const root: TaskComment = {
  id: '11111111-1111-4111-8111-111111111111',
  parentId: null,
  author: users.anna,
  text: 'Мой комментарий',
  createdAt: '2026-11-11T00:00:00Z',
};
const reply: TaskComment = {
  ...root,
  id: '22222222-2222-4222-8222-222222222222',
  parentId: root.id,
  author: users.ivan,
  text: 'Чужой ответ',
};
const taskKey = 'GWT-101';
const path = (comment = root) => `/tasks/${taskKey}/comments/${comment.id}`;

function Comments() {
  const { data } = useQuery({ ...taskQueryOptions(taskKey), enabled: false });
  return (
    <TaskCommentsCard
      task={data!}
      currentUserId={users.anna.id}
      canComment={data!.myRole !== 'guest'}
      timeZone='UTC'
    />
  );
}

function setup(role: BoardRole = 'worker', comments = [root, reply]) {
  const client = createTestQueryClient();
  const task = makeTaskDetail({ key: taskKey, myRole: role, comments });
  client.setQueryData(taskQueryKeys.detail(taskKey), task);
  const api = createApiMock().on('GET', '/boards/9', makeBoard());
  configureApiTransport(api.fetch);
  render(
    <TestProviders client={client}>
      <Comments />
    </TestProviders>,
  );
  const row = (comment = root) =>
    within(document.getElementById(`comment-${comment.id}`)!);
  return { api, client, row };
}

beforeEach(() => vi.stubEnv('VITE_API_URL', '/api/v1'));
afterEach(() => vi.unstubAllEnvs());

describe('действия с комментариями', () => {
  it.each([
    ['worker', 1, 1],
    ['admin', 1, 2],
    ['guest', 0, 0],
  ] as const)(
    '%s: редактирование только своего; удаление по правам',
    (role, edits, deletes) => {
      const { row } = setup(role);
      expect(
        screen.queryAllByRole('button', { name: 'Редактировать комментарий' }),
      ).toHaveLength(edits);
      expect(
        screen.queryAllByRole('button', { name: 'Удалить комментарий' }),
      ).toHaveLength(deletes);
      expect(
        row(reply).queryByRole('button', { name: 'Редактировать комментарий' }),
      ).not.toBeInTheDocument();
    },
  );

  it('редактирует текст и сразу показывает ответ API, сохраняя чужой комментарий', async () => {
    const { api, row } = setup();
    const updated = { ...root, text: 'Сохранённый текст' };
    api.on('PATCH', path(), updated);
    fireEvent.click(
      row().getByRole('button', { name: 'Редактировать комментарий' }),
    );
    const input = row().getByLabelText('Текст комментария');
    const save = row().getByRole('button', { name: 'Сохранить комментарий' });
    expect(input).toHaveValue(root.text);
    expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: '  ' } });
    fireEvent.submit(save.closest('form')!);
    expect(api.callsTo('PATCH', path())).toHaveLength(0);
    fireEvent.change(input, { target: { value: '  Сохранённый текст  ' } });
    fireEvent.click(save);
    await waitFor(() =>
      expect(row().queryByLabelText('Текст комментария')).toBeNull(),
    );
    expect(row().getByText(updated.text)).toBeInTheDocument();
    expect(row(reply).getByText(reply.text)).toBeInTheDocument();
    expect(api.callsTo('PATCH', path())[0]?.body).toEqual({
      text: updated.text,
    });
  });

  it('отмена редактирования сбрасывает черновик без запроса', () => {
    const { api, row } = setup();
    fireEvent.click(
      row().getByRole('button', { name: 'Редактировать комментарий' }),
    );
    fireEvent.change(row().getByLabelText('Текст комментария'), {
      target: { value: 'Черновик' },
    });
    fireEvent.click(row().getByRole('button', { name: 'Отмена' }));
    expect(api.callsTo('PATCH', path())).toHaveLength(0);
    fireEvent.click(
      row().getByRole('button', { name: 'Редактировать комментарий' }),
    );
    expect(row().getByLabelText('Текст комментария')).toHaveValue(root.text);
  });

  it('ошибка сохранения оставляет черновик и разрешает повторить', async () => {
    const { api, row } = setup();
    api.on('PATCH', path(), apiError('ROLE_FORBIDDEN', 'Изменять нельзя'), {
      status: 403,
    });
    fireEvent.click(
      row().getByRole('button', { name: 'Редактировать комментарий' }),
    );
    fireEvent.change(row().getByLabelText('Текст комментария'), {
      target: { value: 'Черновик' },
    });
    fireEvent.click(
      row().getByRole('button', { name: 'Сохранить комментарий' }),
    );
    expect(await row().findByText('Изменять нельзя')).toBeInTheDocument();
    expect(row().getByLabelText('Текст комментария')).toHaveValue('Черновик');
    expect(row().getByText(root.text)).toBeInTheDocument();
    api.on('PATCH', path(), { ...root, text: 'Черновик' });
    fireEvent.click(
      row().getByRole('button', { name: 'Сохранить комментарий' }),
    );
    await waitFor(() =>
      expect(row().queryByLabelText('Текст комментария')).toBeNull(),
    );
    expect(row().getByText('Черновик')).toBeInTheDocument();
  });

  it('редактирование сохраняет и добавляет упоминания участников', async () => {
    const text = `@${users.ivan.name} привет`;
    const mention = {
      userId: users.ivan.id,
      start: 0,
      end: users.ivan.name.length + 1,
    };
    const { api, row } = setup('worker', [
      { ...root, text, mentions: [mention] },
      reply,
    ]);
    api.on('PATCH', path(), (call: { body: unknown }) => ({
      ...root,
      ...(call.body as object),
    }));
    fireEvent.click(
      row().getByRole('button', { name: 'Редактировать комментарий' }),
    );
    fireEvent.change(row().getByLabelText('Текст комментария'), {
      target: { value: `${text} @`, selectionStart: text.length + 2 },
    });
    const option = await row().findByRole('option', {
      name: new RegExp(users.viktoria.name),
    });
    fireEvent.click(option);
    fireEvent.click(
      row().getByRole('button', { name: 'Сохранить комментарий' }),
    );
    await waitFor(() => expect(api.callsTo('PATCH', path())).toHaveLength(1));
    expect(api.callsTo('PATCH', path())[0]?.body).toMatchObject({
      mentions: [
        mention,
        expect.objectContaining({ userId: users.viktoria.id }),
      ],
    });
  });

  it('подтверждает удаление, отмена оставляет комментарий', () => {
    const { api, row } = setup();
    fireEvent.click(row().getByRole('button', { name: 'Удалить комментарий' }));
    const dialog = within(
      screen.getByRole('dialog', { name: 'Удалить комментарий?' }),
    );
    expect(api.callsTo('DELETE', path())).toHaveLength(0);
    fireEvent.click(dialog.getByRole('button', { name: 'Отмена' }));
    expect(row().getByText(root.text)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('удаляет свой комментарий, сохраняет чужой ответ на верхнем уровне', async () => {
    const { api, client, row } = setup();
    api.on('DELETE', path(), undefined, { status: 204 });
    fireEvent.click(row().getByRole('button', { name: 'Удалить комментарий' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Удалить',
      }),
    );
    await waitFor(() =>
      expect(
        document.getElementById(`comment-${root.id}`),
      ).not.toBeInTheDocument(),
    );
    expect(row(reply).getByText(reply.text)).toBeInTheDocument();
    expect(client.getQueryData(taskQueryKeys.detail(taskKey))).toMatchObject({
      comments: [{ ...reply, parentId: null }],
    });
    expect(
      screen.getByRole('heading', { name: 'Комментарии · 1' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('администратор удаляет чужой комментарий; ошибка сохраняет его и позволяет повторить', async () => {
    const { api, row } = setup('admin');
    api.on(
      'DELETE',
      path(reply),
      apiError('INTERNAL_ERROR', 'Не удалось удалить'),
      { status: 500 },
    );
    fireEvent.click(
      row(reply).getByRole('button', { name: 'Удалить комментарий' }),
    );
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Удалить' }));
    expect(await dialog.findByText('Не удалось удалить')).toBeInTheDocument();
    expect(row(reply).getByText(reply.text)).toBeInTheDocument();
    api.on('DELETE', path(reply), undefined, { status: 204 });
    fireEvent.click(dialog.getByRole('button', { name: 'Удалить' }));
    await waitFor(() =>
      expect(
        document.getElementById(`comment-${reply.id}`),
      ).not.toBeInTheDocument(),
    );
    expect(row().getByText(root.text)).toBeInTheDocument();
  });
});
