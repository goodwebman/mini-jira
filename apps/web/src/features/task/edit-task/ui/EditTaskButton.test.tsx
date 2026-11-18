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
  makeTask,
  makeTaskDetail,
} from '@/shared/lib/testing';

import { EditTaskButton } from './EditTaskButton';

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

const open = () => {
  render(
    <TestProviders client={client}>
      <EditTaskButton task={task} />
    </TestProviders>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Редактировать задачу' }));
  return within(screen.getByRole('dialog', { name: 'Редактирование задачи' }));
};

describe('редактирование задачи', () => {
  it('заполняет форму, запрещает пустое название, сохраняет изменённый текст в API и кэш', async () => {
    api.on(
      'PATCH',
      `/tasks/${task.key}`,
      makeTask({ ...task, title: 'Новое название' }),
    );
    const dialog = open();
    expect(dialog.getByLabelText('Название')).toHaveValue(task.title);
    expect(dialog.getByLabelText(/^Описание/)).toHaveValue(task.description);
    const save = dialog.getByRole('button', { name: 'Сохранить' });
    expect(save).toBeDisabled();
    fireEvent.change(dialog.getByLabelText('Название'), {
      target: { value: '   ' },
    });
    fireEvent.submit(save.closest('form')!);
    expect(api.callsTo('PATCH', `/tasks/${task.key}`)).toHaveLength(0);
    fireEvent.change(dialog.getByLabelText('Название'), {
      target: { value: '  Новое название  ' },
    });
    fireEvent.change(dialog.getByLabelText(/^Описание/), {
      target: { value: '' },
    });
    fireEvent.click(save);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(api.callsTo('PATCH', `/tasks/${task.key}`)[0]?.body).toEqual({
      title: 'Новое название',
      description: '',
    });
    expect(client.getQueryData(taskQueryKeys.detail(task.key))).toMatchObject({
      title: 'Новое название',
      description: '',
    });
    expect(
      client.getQueryData(taskQueryKeys.board(task.boardId)),
    ).toMatchObject({ items: [{ title: 'Новое название' }] });
    expect(
      await screen.findByText(`Задача ${task.key} сохранена`),
    ).toBeInTheDocument();
  });

  it('отмена не отправляет запрос и при открытии сбрасывает черновик', () => {
    const dialog = open();
    fireEvent.change(dialog.getByLabelText('Название'), {
      target: { value: 'Черновик' },
    });
    fireEvent.click(dialog.getByRole('button', { name: 'Отмена' }));
    expect(api.calls).toHaveLength(0);
    fireEvent.click(
      screen.getByRole('button', { name: 'Редактировать задачу' }),
    );
    expect(screen.getByLabelText('Название')).toHaveValue(task.title);
  });

  it('проверяет длину описания до запроса', () => {
    const dialog = open();
    fireEvent.change(dialog.getByLabelText(/^Описание/), {
      target: { value: 'a'.repeat(20_001) },
    });
    fireEvent.click(dialog.getByRole('button', { name: 'Сохранить' }));
    expect(dialog.getByLabelText(/^Описание/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(api.calls).toHaveLength(0);
  });

  it.each([
    {
      status: 422,
      body: apiError('VALIDATION_ERROR', 'Ошибка', {
        title: 'Название отклонено',
      }),
      message: 'Название отклонено',
    },
    {
      status: 403,
      body: apiError('ROLE_FORBIDDEN', 'Недостаточно прав'),
      message: 'Недостаточно прав',
    },
    {
      status: 500,
      body: apiError('INTERNAL_ERROR', 'Сбой сервера'),
      message: 'Сбой сервера',
    },
  ])(
    'ошибка $status сохраняет черновик и старый кэш',
    async ({ status, body, message }) => {
      api.on('PATCH', `/tasks/${task.key}`, body, { status });
      const dialog = open();
      fireEvent.change(dialog.getByLabelText('Название'), {
        target: { value: 'Черновик' },
      });
      fireEvent.click(dialog.getByRole('button', { name: 'Сохранить' }));
      expect(await dialog.findByText(message)).toBeInTheDocument();
      expect(dialog.getByLabelText('Название')).toHaveValue('Черновик');
      expect(client.getQueryData(taskQueryKeys.detail(task.key))).toMatchObject(
        { title: task.title },
      );
    },
  );
});
