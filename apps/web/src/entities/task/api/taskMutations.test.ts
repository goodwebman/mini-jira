// @vitest-environment node
/**
 * Тесткейсы: создание/изменение и детали задачи; pause/resume/take-lock;
 * обе стороны links; комментарий с trim; валидация до сети; HTTP 403/409/422.
 */
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureApiTransport } from '@/shared/api';

import {
  clearTaskTakeLock,
  createTask,
  createTaskComment,
  createTaskLink,
  deleteTaskLink,
  pauseTask,
  resumeTask,
  setTaskTakeLock,
  taskQueryOptions,
  updateTask,
} from '../index';

const transport = vi.fn<typeof fetch>();
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Анна',
  job: '',
  colorIndex: 0,
};
const sprint = {
  id: 's1',
  number: 1,
  state: 'active',
  startDate: '2026-11-02',
  endDate: '2026-11-13',
};
const card = {
  id: 't1',
  key: 'GWT-1',
  boardId: 9,
  sprintId: 's1',
  title: 'API',
  status: 'todo',
  priority: 'med',
  sp: 3,
  createdAt: '2026-11-11T00:00:00Z',
  linkCount: 0,
  isBlocked: false,
  isTakeLocked: false,
  timer: {
    statusEnteredAt: '2026-11-11T00:00:00Z',
    pausedAt: null,
    pausedTotalSec: 0,
    canPause: false,
    completedInDays: null,
  },
  people: { author: user, reviewer: user, tester: null, designer: null },
};

beforeEach(() => {
  transport.mockReset();
  configureApiTransport(transport);
  vi.stubEnv('VITE_API_URL', '/api/v1');
});
afterEach(() => vi.unstubAllEnvs());

describe('task mutations', () => {
  it('создаёт задачу с необязательными людьми null', async () => {
    transport.mockResolvedValue(Response.json(card, { status: 201 }));
    await expect(
      createTask(9, {
        title: ' API ',
        sp: 3,
        authorId: user.id,
        reviewerId: user.id,
        testerId: null,
      }),
    ).resolves.toEqual(card);
    expect(transport.mock.calls[0]).toEqual([
      '/api/v1/boards/9/tasks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'API',
          sp: 3,
          authorId: user.id,
          reviewerId: user.id,
          testerId: null,
        }),
      }),
    ]);
  });

  it('изменение статуса отправляет только status и возвращает новую карточку', async () => {
    transport.mockResolvedValue(Response.json({ ...card, status: 'work' }));
    await expect(updateTask('GWT-1', { status: 'work' })).resolves.toEqual({
      ...card,
      status: 'work',
    });
    expect(transport.mock.calls[0]).toEqual([
      '/api/v1/tasks/GWT-1',
      expect.objectContaining({ method: 'PATCH', body: '{"status":"work"}' }),
    ]);
  });

  it('детали сохраняют nullable роли и серверное время', async () => {
    const client = new QueryClient();
    const detail = {
      ...card,
      description: '',
      board: { id: 9, key: 'GWT', name: 'Команда' },
      sprint,
      myRole: 'worker',
      links: [],
      comments: [],
      assigneeOptions: [user],
      serverTime: '2026-11-11T00:00:00Z',
    };
    transport.mockResolvedValue(Response.json(detail));
    await expect(client.fetchQuery(taskQueryOptions('GWT-1'))).resolves.toEqual(
      detail,
    );
    expect(transport.mock.calls[0][0]).toBe('/api/v1/tasks/GWT-1');
    client.clear();
  });

  it.each([
    { run: setTaskTakeLock, action: 'take-lock', method: 'PUT' },
    { run: clearTaskTakeLock, action: 'take-lock', method: 'DELETE' },
    { run: pauseTask, action: 'pause', method: 'POST' },
    { run: resumeTask, action: 'resume', method: 'POST' },
  ])('$method $action возвращает карточку', async ({ run, action, method }) => {
    transport.mockResolvedValue(Response.json(card));
    await expect(run('GWT-1')).resolves.toEqual(card);
    expect(transport.mock.calls[0]).toEqual([
      `/api/v1/tasks/GWT-1/${action}`,
      expect.objectContaining({ method, body: undefined }),
    ]);
  });

  it('создаёт связь и удаляет её по ключу целевой задачи', async () => {
    const link = {
      type: 'blocks',
      task: {
        key: 'OTHER-2',
        title: 'Связанная',
        status: 'todo',
        boardName: 'Другая',
        canOpen: true,
      },
    };
    transport
      .mockResolvedValueOnce(Response.json(link, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(
      createTaskLink('GWT-1', { type: 'blocks', targetKey: 'OTHER-2' }),
    ).resolves.toEqual(link);
    await expect(deleteTaskLink('GWT-1', 'OTHER-2')).resolves.toBeUndefined();
    expect(transport.mock.calls[0]).toEqual([
      '/api/v1/tasks/GWT-1/links',
      expect.objectContaining({
        method: 'POST',
        body: '{"type":"blocks","targetKey":"OTHER-2"}',
      }),
    ]);
    expect(transport.mock.calls[1]).toEqual([
      '/api/v1/tasks/GWT-1/links/OTHER-2',
      expect.objectContaining({ method: 'DELETE' }),
    ]);
  });

  it('пустой комментарий не отправляется, непустой сохраняется с trim', async () => {
    await expect(createTaskComment('GWT-1', { text: '  ' })).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
    const comment = {
      id: 'c1',
      author: user,
      text: 'Готово',
      createdAt: '2026-11-11T00:00:00Z',
    };
    transport.mockResolvedValue(Response.json(comment, { status: 201 }));
    await expect(
      createTaskComment('GWT-1', { text: ' Готово ' }),
    ).resolves.toEqual(comment);
    expect(transport.mock.calls[0]).toEqual([
      '/api/v1/tasks/GWT-1/comments',
      expect.objectContaining({ method: 'POST', body: '{"text":"Готово"}' }),
    ]);
  });

  it.each([403, 409, 422])(
    'ошибка %s не превращается в успешную мутацию',
    async (status) => {
      transport.mockResolvedValue(
        Response.json({ error: { code: 'TASK_TAKE_LOCKED' } }, { status }),
      );
      await expect(
        updateTask('GWT-1', { status: 'work' }),
      ).rejects.toMatchObject({
        status,
        body: { error: { code: 'TASK_TAKE_LOCKED' } },
      });
    },
  );
});
