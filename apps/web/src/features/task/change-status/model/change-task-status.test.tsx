/**
 * Тесткейсы смены статуса:
 * - запрещённый ход не уходит в сеть и объясняется тостом;
 * - разрешённый ход сразу двигает карточку, ответ сервера кладётся в кэш;
 * - отказ сервера откатывает карточку;
 * - DnD: колонка подсвечивается ok/bad до броска, бросок вызывает onDrop, гость не тащит.
 */
import type { ReactNode } from 'react';

import { act, renderHook, screen, waitFor } from '@testing-library/react';
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
  users,
} from '@/shared/lib/testing';

import { useChangeTaskStatus, useTaskDragAndDrop } from '../index';

let api: ApiMock;
const client = createTestQueryClient();
const wrapper = ({ children }: { children: ReactNode }) => (
  <TestProviders client={client}>{children}</TestProviders>
);
const boardItems = () =>
  client.getQueryData<{ items: { key: string; status: string }[] }>(
    taskQueryKeys.board(9),
  )?.items;

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', '/api/v1');
  api = createApiMock();
  configureApiTransport(api.fetch);
  client.clear();
});

describe('useChangeTaskStatus', () => {
  const worker = { id: users.dmitry.id, role: 'worker' as const };

  it('запрещённый ход: без запроса, с понятным тостом', async () => {
    const locked = makeTask({ status: 'todo', isTakeLocked: true });
    const { result } = renderHook(() => useChangeTaskStatus(worker), {
      wrapper,
    });
    let sent = true;
    act(() => {
      sent = result.current.changeStatus(locked, 'work');
    });
    expect(sent).toBe(false);
    expect(result.current.canMove(locked, 'work')).toBe(false);
    expect(api.calls).toHaveLength(0);
    expect(
      await screen.findByText(
        'Администратор запретил брать эту задачу в работу',
      ),
    ).toBeInTheDocument();
  });

  it('разрешённый ход оптимистичен, ответ сервера заменяет карточку', async () => {
    const task = makeTask({ status: 'todo' });
    client.setQueryData(taskQueryKeys.board(9), makeBoardTasks([task]));
    let release: () => void = () => {};
    api.on('PATCH', `/tasks/${task.key}`, async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { ...task, status: 'work', linkCount: 7 };
    });
    const { result } = renderHook(() => useChangeTaskStatus(worker), {
      wrapper,
    });

    act(() => {
      result.current.changeStatus(task, 'work');
    });
    await waitFor(() => expect(boardItems()?.[0]?.status).toBe('work'));
    expect(api.calls[0]?.body).toEqual({ status: 'work' });

    act(() => release());
    await waitFor(() =>
      expect(
        client.getQueryData<{ items: { linkCount: number }[] }>(
          taskQueryKeys.board(9),
        )?.items[0]?.linkCount,
      ).toBe(7),
    );
  });

  it('отказ сервера возвращает карточку на место', async () => {
    const task = makeTask({
      status: 'review',
      people: { ...makeTask().people, reviewer: users.dmitry },
    });
    client.setQueryData(taskQueryKeys.board(9), makeBoardTasks([task]));
    api.on(
      'PATCH',
      `/tasks/${task.key}`,
      apiError('STATUS_MOVE_FORBIDDEN', 'Нельзя'),
      {
        status: 403,
      },
    );
    const { result } = renderHook(() => useChangeTaskStatus(worker), {
      wrapper,
    });
    act(() => {
      result.current.changeStatus(task, 'work');
    });
    await waitFor(() => expect(api.calls).toHaveLength(1));
    await waitFor(() => expect(boardItems()?.[0]?.status).toBe('review'));
  });
});

describe('useTaskDragAndDrop', () => {
  const dataTransfer = () => {
    const data = new Map<string, string>();
    return {
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? '',
      effectAllowed: 'none',
    };
  };
  const event = (transfer: ReturnType<typeof dataTransfer>) =>
    ({
      dataTransfer: transfer,
      preventDefault: vi.fn(),
      currentTarget: document.body,
      relatedTarget: null,
    }) as never;

  it('подсвечивает колонку заранее и бросает карточку', () => {
    const task = makeTask({ status: 'todo' });
    const onDrop = vi.fn();
    const { result } = renderHook(() =>
      useTaskDragAndDrop({
        tasks: [task],
        enabled: true,
        canDrop: (_task, to) => to !== 'done',
        onDrop,
      }),
    );
    const transfer = dataTransfer();
    act(() => result.current.cardProps(task).onDragStart?.(event(transfer)));
    expect(result.current.draggingKey).toBe(task.key);

    act(() => result.current.columnProps('done').onDragOver?.(event(transfer)));
    expect(result.current.columnProps('done').dropState).toBe('bad');
    act(() => result.current.columnProps('work').onDragOver?.(event(transfer)));
    expect(result.current.columnProps('work').dropState).toBe('ok');
    expect(result.current.columnProps('done').dropState).toBeNull();

    act(() => result.current.columnProps('work').onDrop?.(event(transfer)));
    expect(onDrop).toHaveBeenCalledWith(task, 'work');
    expect(result.current.draggingKey).toBeNull();
  });

  it('бросок в свою колонку ничего не делает; гость не тащит', () => {
    const task = makeTask({ status: 'work' });
    const onDrop = vi.fn();
    const { result } = renderHook(() =>
      useTaskDragAndDrop({
        tasks: [task],
        enabled: true,
        canDrop: () => true,
        onDrop,
      }),
    );
    const transfer = dataTransfer();
    act(() => result.current.cardProps(task).onDragStart?.(event(transfer)));
    act(() => result.current.columnProps('work').onDrop?.(event(transfer)));
    expect(onDrop).not.toHaveBeenCalled();

    const guest = renderHook(() =>
      useTaskDragAndDrop({
        tasks: [task],
        enabled: false,
        canDrop: () => true,
        onDrop,
      }),
    );
    expect(guest.result.current.cardProps(task)).toEqual({ draggable: false });
    expect(guest.result.current.columnProps('todo')).toEqual({
      dropState: null,
    });
  });

  describe('серия переносов', () => {
    it('отказ по одной карточке не откатывает соседний ход', async () => {
      const worker = { id: users.dmitry.id, role: 'worker' as const };
      const a = makeTask({ status: 'todo' });
      const b = makeTask({ status: 'todo' });
      client.setQueryData(taskQueryKeys.board(9), makeBoardTasks([a, b]));
      api.on(
        'GET',
        '/boards/9/tasks',
        makeBoardTasks([a, { ...b, status: 'work' }]),
      );
      api.on(
        'PATCH',
        `/tasks/${a.key}`,
        apiError('TASK_TAKE_LOCKED', 'Запрет'),
        {
          status: 403,
        },
      );
      api.on('PATCH', `/tasks/${b.key}`, { ...b, status: 'work' });
      const { result } = renderHook(() => useChangeTaskStatus(worker), {
        wrapper,
      });
      act(() => {
        result.current.changeStatus(a, 'work');
        result.current.changeStatus(b, 'work');
      });
      await waitFor(() =>
        expect(api.calls.filter((c) => c.method === 'PATCH')).toHaveLength(2),
      );
      await waitFor(() =>
        expect(boardItems()?.map((item) => item.status)).toEqual([
          'todo',
          'work',
        ]),
      );
    });
  });
});
