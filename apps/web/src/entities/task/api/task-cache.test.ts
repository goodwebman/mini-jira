// @vitest-environment node
/**
 * Тесткейсы кэша задач:
 * - карточка из ответа мутации заменяет старую в доске и сливается с деталью;
 * - новая карточка добавляется в доску только своего (активного) спринта;
 * - комментарий дописывается в деталь, летящий старый ответ его не затирает;
 * - оптимистичный перенос сбрасывает таймер и запрет, летящий ответ доски его не перетирает;
 * - откат возвращает одну карточку и не трогает соседние и повторно перенесённую.
 */
import type { BoardTasksResponse } from '@gwmt/contracts';
import { describe, expect, it } from 'vitest';

import {
  createTestQueryClient,
  makeBoardTasks,
  makeTask,
  makeTaskDetail,
  users,
} from '@/shared/lib/testing';

import {
  appendTaskComment,
  moveTaskInBoardCache,
  putTaskCardInCache,
  restoreTaskMove,
} from './task-cache';
import { taskQueryKeys } from './taskQueries';

const board = (client: ReturnType<typeof createTestQueryClient>) =>
  client.getQueryData<BoardTasksResponse>(taskQueryKeys.board(9))?.items;

describe('putTaskCardInCache', () => {
  it('карточка из ответа попадает в доску и деталь, не затирая описание', () => {
    const client = createTestQueryClient();
    const task = makeTask({ status: 'work' });
    client.setQueryData(taskQueryKeys.board(9), makeBoardTasks([task]));
    client.setQueryData(
      taskQueryKeys.detail(task.key),
      makeTaskDetail({ key: task.key, description: 'важное' }),
    );

    putTaskCardInCache(client, { ...task, title: 'Новое название' });

    expect(board(client)?.[0]?.title).toBe('Новое название');
    expect(client.getQueryData(taskQueryKeys.detail(task.key))).toMatchObject({
      title: 'Новое название',
      description: 'важное',
    });
  });

  it('новая карточка встаёт в конец доски только своего спринта', () => {
    const client = createTestQueryClient();
    const first = makeTask();
    client.setQueryData(taskQueryKeys.board(9), makeBoardTasks([first]));
    const created = makeTask();
    putTaskCardInCache(client, created);
    putTaskCardInCache(client, makeTask({ sprintId: 'sprint-13' }));
    expect(board(client)).toEqual([first, created]);

    putTaskCardInCache(client, makeTask({ boardId: 11 }));
    expect(client.getQueryData(taskQueryKeys.board(11))).toBeUndefined();
  });

  it('комментарий дописывается в деталь', async () => {
    const client = createTestQueryClient();
    client.setQueryData(
      taskQueryKeys.detail('GWT-1'),
      makeTaskDetail({ key: 'GWT-1' }),
    );
    const comment = {
      id: 'c1',
      parentId: null,
      author: users.anna,
      text: 'Готово',
      createdAt: '2026-11-06T09:00:00.000Z',
    };
    await appendTaskComment(client, 'GWT-1', comment);
    expect(
      client.getQueryData<{ comments: unknown[] }>(
        taskQueryKeys.detail('GWT-1'),
      )?.comments,
    ).toEqual([comment]);
  });

  it('летящий ответ детали не затирает сохранённый комментарий', async () => {
    const client = createTestQueryClient();
    const detail = makeTaskDetail({ comments: [] });
    const queryKey = taskQueryKeys.detail(detail.key);
    client.setQueryData(queryKey, detail);
    let release: () => void = () => {};
    const stale = client
      .fetchQuery({
        queryKey,
        staleTime: 0,
        queryFn: () =>
          new Promise<typeof detail>((resolve) => {
            release = () => resolve(detail);
          }),
      })
      .catch(() => {});
    const comment = {
      id: 'c1',
      parentId: null,
      author: users.anna,
      text: 'Готово',
      createdAt: '2026-11-06T09:00:00.000Z',
    };

    await appendTaskComment(client, detail.key, comment);
    release();
    await stale;

    expect(client.getQueryData<typeof detail>(queryKey)?.comments).toEqual([
      comment,
    ]);
  });
});

describe('оптимистичный перенос', () => {
  it('статус, свежий таймер, снятый запрет', async () => {
    const client = createTestQueryClient();
    const task = makeTask({
      status: 'todo',
      isTakeLocked: true,
      timer: { ...makeTask().timer, pausedTotalSec: 120 },
    });
    client.setQueryData(taskQueryKeys.board(9), makeBoardTasks([task]));
    await moveTaskInBoardCache(
      client,
      9,
      task.key,
      'work',
      '2026-11-06T12:00:00.000Z',
    );
    expect(board(client)?.[0]).toMatchObject({
      status: 'work',
      isTakeLocked: false,
      timer: {
        statusEnteredAt: '2026-11-06T12:00:00.000Z',
        pausedAt: null,
        pausedTotalSec: 0,
        canPause: true,
      },
    });
  });

  it('летящий ответ доски со старыми данными не перетирает перенос', async () => {
    const client = createTestQueryClient();
    const task = makeTask({ status: 'todo' });
    client.setQueryData(taskQueryKeys.board(9), makeBoardTasks([task]));
    let release: () => void = () => {};
    const stale = client.fetchQuery({
      queryKey: taskQueryKeys.board(9),
      staleTime: 0,
      queryFn: () =>
        new Promise<BoardTasksResponse>((resolve) => {
          release = () => resolve(makeBoardTasks([task]));
        }),
    });
    await moveTaskInBoardCache(
      client,
      9,
      task.key,
      'work',
      '2026-11-06T12:00:00.000Z',
    );
    release();
    await stale.catch(() => {});
    expect(board(client)?.[0]?.status).toBe('work');
  });

  it('откат возвращает только свою карточку', async () => {
    const client = createTestQueryClient();
    const a = makeTask({ status: 'todo' });
    const b = makeTask({ status: 'todo' });
    client.setQueryData(taskQueryKeys.board(9), makeBoardTasks([a, b]));
    const moveA = await moveTaskInBoardCache(client, 9, a.key, 'work', 't1');
    await moveTaskInBoardCache(client, 9, b.key, 'work', 't2');

    restoreTaskMove(client, moveA);
    expect(board(client)?.map((item) => item.status)).toEqual(['todo', 'work']);
  });

  it('откат не трогает карточку, которую уже перенесли ещё раз', async () => {
    const client = createTestQueryClient();
    const task = makeTask({ status: 'todo' });
    client.setQueryData(taskQueryKeys.board(9), makeBoardTasks([task]));
    const first = await moveTaskInBoardCache(client, 9, task.key, 'work', 't1');
    await moveTaskInBoardCache(client, 9, task.key, 'review', 't2');
    restoreTaskMove(client, first);
    expect(board(client)?.[0]?.status).toBe('review');
  });
});
