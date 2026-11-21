import type { ReactNode } from 'react';

import type { BoardTaskEvent } from '@gwmt/contracts';
import { useMutation } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { taskQueryKeys } from '@/entities/task';
import { TASK_STATUS_MUTATION_KEY } from '@/features/task/change-status';
import { configureApiTransport } from '@/shared/api';
import {
  TestProviders,
  createApiMock,
  createTestQueryClient,
  makeBoardTasks,
  makeTask,
} from '@/shared/lib/testing';

import { useLiveBoardTasks } from './use-live-board-tasks';

const client = createTestQueryClient();
const wrapper = ({ children }: { readonly children: ReactNode }) => (
  <TestProviders client={client}>{children}</TestProviders>
);
const task = makeTask({ status: 'todo' });
let api: ReturnType<typeof createApiMock>;
let stream: ReadableStreamDefaultController<Uint8Array>;
let cancelled = vi.fn<() => void>();
const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(5);
  });
const send = (event: BoardTaskEvent) => {
  stream.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
  );
  return flush();
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('VITE_API_URL', '/api/v1');
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  api = createApiMock();
  cancelled = vi.fn();
  api.on('GET', '/boards/9/tasks', makeBoardTasks([task]));
  api.on(
    'GET',
    '/boards/9/tasks/events',
    () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            stream = controller;
          },
          cancel: cancelled,
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      ),
  );
  configureApiTransport(api.fetch);
  client.setQueryDefaults(taskQueryKeys.all, { staleTime: 30_000 });
  client.setQueryData(taskQueryKeys.board(9), makeBoardTasks([task]));
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('useLiveBoardTasks SSE', () => {
  it('сверяет снимок при подключении, затем применяет переносы без GET и polling', async () => {
    const { result, unmount } = renderHook(() => useLiveBoardTasks(9), {
      wrapper,
    });
    await flush();
    await send({ type: 'ready' });
    expect(api.callsTo('GET', '/boards/9/tasks')).toHaveLength(1);
    await send({
      type: 'tasks.changed',
      items: [{ ...task, status: 'work' }],
      serverTime: new Date().toISOString(),
    });
    expect(result.current.data.items[0]?.status).toBe('work');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(api.callsTo('GET', '/boards/9/tasks')).toHaveLength(1);
    expect(api.callsTo('GET', '/boards/9/tasks/events')).toHaveLength(1);
    unmount();
    await flush();
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it('восстанавливает соединение после обрыва и сверяет пропущенные изменения', async () => {
    const { result } = renderHook(() => useLiveBoardTasks(9), { wrapper });
    await flush();
    await send({ type: 'ready' });
    stream.close();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(api.callsTo('GET', '/boards/9/tasks/events')).toHaveLength(2);
    api.on(
      'GET',
      '/boards/9/tasks',
      makeBoardTasks([{ ...task, status: 'review' }]),
    );
    await send({ type: 'ready' });
    expect(result.current.data.items[0]?.status).toBe('review');
  });

  it('применяет изменение карточки после снимка, из которого удалили её соседа', async () => {
    const remaining = makeTask({ key: 'GWT-901' });
    client.setQueryData(
      taskQueryKeys.board(9),
      makeBoardTasks([task, remaining]),
    );
    let finishRefresh = () => {};
    api.on(
      'GET',
      '/boards/9/tasks',
      () =>
        new Promise((resolve) => {
          finishRefresh = () => resolve(makeBoardTasks([remaining]));
        }),
    );
    const { result } = renderHook(() => useLiveBoardTasks(9), { wrapper });
    await flush();
    await send({ type: 'ready' });
    await send({
      type: 'tasks.changed',
      items: [{ ...remaining, status: 'done' }],
      serverTime: new Date().toISOString(),
    });
    expect(result.current.data.items).toHaveLength(2);

    act(() => finishRefresh());
    await flush();
    expect(
      result.current.data.items.map(({ key, status }) => [key, status]),
    ).toEqual([[remaining.key, 'done']]);
  });

  it('закрывает соединение в скрытой вкладке и подключается при возвращении', async () => {
    renderHook(() => useLiveBoardTasks(9), { wrapper });
    await flush();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await flush();
    expect(cancelled).toHaveBeenCalledOnce();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(api.callsTo('GET', '/boards/9/tasks/events')).toHaveLength(1);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await flush();
    expect(api.callsTo('GET', '/boards/9/tasks/events')).toHaveLength(2);
  });

  it('не затирает собственный перенос событием и сверяется после завершения мутации', async () => {
    let release = () => {};
    const { result } = renderHook(
      () => {
        const query = useLiveBoardTasks(9);
        const move = useMutation({
          mutationKey: TASK_STATUS_MUTATION_KEY,
          mutationFn: () =>
            new Promise<void>((resolve) => {
              release = resolve;
            }),
        });
        return { query, move };
      },
      { wrapper },
    );
    await flush();
    act(() => {
      result.current.move.mutate();
    });
    await flush();
    await send({
      type: 'tasks.changed',
      items: [{ ...task, status: 'work' }],
      serverTime: new Date().toISOString(),
    });
    expect(result.current.query.data.items[0]?.status).toBe('todo');
    expect(api.callsTo('GET', '/boards/9/tasks')).toHaveLength(0);
    api.on(
      'GET',
      '/boards/9/tasks',
      makeBoardTasks([{ ...task, status: 'done' }]),
    );
    act(() => release());
    await flush();
    expect(result.current.query.data.items[0]?.status).toBe('done');
    expect(api.callsTo('GET', '/boards/9/tasks')).toHaveLength(1);
  });

  it('применяет события во время мутации, которая не переносит карточки', async () => {
    let release = () => {};
    const { result } = renderHook(
      () => ({
        query: useLiveBoardTasks(9),
        editTask: useMutation({
          mutationKey: ['task', 'edit'],
          mutationFn: () =>
            new Promise<void>((resolve) => {
              release = resolve;
            }),
        }),
      }),
      { wrapper },
    );
    await flush();
    act(() => result.current.editTask.mutate());
    await flush();

    await send({
      type: 'tasks.changed',
      items: [{ ...task, status: 'work' }],
      serverTime: new Date().toISOString(),
    });

    expect(result.current.query.data.items[0]?.status).toBe('work');
    expect(api.callsTo('GET', '/boards/9/tasks')).toHaveLength(0);
    act(() => release());
    await flush();
  });

  it('отклоняет карточку чужой доски и не меняет кэш', async () => {
    const { result } = renderHook(() => useLiveBoardTasks(9), { wrapper });
    await flush();
    await send({
      type: 'tasks.changed',
      items: [{ ...task, boardId: 10, status: 'done' }],
      serverTime: new Date().toISOString(),
    });
    expect(result.current.data.items[0]?.status).toBe('todo');
    expect(cancelled).toHaveBeenCalledOnce();
  });
});
