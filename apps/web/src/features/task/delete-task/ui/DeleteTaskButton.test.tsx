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
  makeBoardTasks,
  makeTaskDetail,
} from '@/shared/lib/testing';

import { DeleteTaskButton } from './DeleteTaskButton';

const client = createTestQueryClient();
const task = makeTaskDetail();
let api: ApiMock;

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', '/api/v1');
  client.clear();
  api = createApiMock();
  configureApiTransport(api.fetch);
  client.setQueryData(
    taskQueryKeys.board(task.boardId),
    makeBoardTasks([task]),
  );
  client.setQueryData(taskQueryKeys.detail(task.key), task);
});

const open = (onDeleted = vi.fn()) => {
  render(
    <TestProviders client={client}>
      <DeleteTaskButton
        boardId={task.boardId}
        taskKey={task.key}
        onDeleted={onDeleted}
      />
    </TestProviders>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Удалить задачу' }));
  return within(
    screen.getByRole('dialog', { name: `Удалить задачу ${task.key}?` }),
  );
};

describe('удаление задачи', () => {
  it('запрашивает подтверждение; отмена не удаляет задачу', () => {
    const onDeleted = vi.fn();
    const dialog = open(onDeleted);
    expect(api.calls).toHaveLength(0);
    fireEvent.click(dialog.getByRole('button', { name: 'Отмена' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
    expect(onDeleted).not.toHaveBeenCalled();
    expect(client.getQueryData(taskQueryKeys.detail(task.key))).toEqual(task);
  });

  it('после подтверждения удаляет задачу, очищает кэш и уведомляет страницу', async () => {
    api.on('DELETE', `/tasks/${task.key}`, undefined, { status: 204 });
    const onDeleted = vi.fn();
    const dialog = open(onDeleted);
    fireEvent.click(dialog.getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(api.callsTo('DELETE', `/tasks/${task.key}`)).toHaveLength(1);
    expect(client.getQueryData(taskQueryKeys.detail(task.key))).toBeUndefined();
    expect(
      client.getQueryData(taskQueryKeys.board(task.boardId)),
    ).toMatchObject({ items: [] });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      await screen.findByText(`Задача ${task.key} удалена`),
    ).toBeInTheDocument();
  });

  it('при ошибке оставляет задачу и позволяет повторить удаление', async () => {
    api.on(
      'DELETE',
      `/tasks/${task.key}`,
      apiError('INTERNAL_ERROR', 'Не удалось удалить'),
      { status: 500 },
    );
    const onDeleted = vi.fn();
    const dialog = open(onDeleted);
    fireEvent.click(dialog.getByRole('button', { name: 'Удалить' }));
    expect(await dialog.findByText('Не удалось удалить')).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(client.getQueryData(taskQueryKeys.detail(task.key))).toEqual(task);
    expect(dialog.getByRole('button', { name: 'Удалить' })).toBeEnabled();
    api.on('DELETE', `/tasks/${task.key}`, undefined, { status: 204 });
    fireEvent.click(dialog.getByRole('button', { name: 'Удалить' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
  });
});
