import type { BoardDetail, BoardListResponse } from '@gwmt/contracts';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  boardFavorites,
  boardMembers,
  notifications,
  sprintTasks,
  sprints,
  taskComments,
  taskPauses,
  taskStatusIntervals,
} from '../src/db/schema.js';
import * as taskRepo from '../src/modules/tasks/repo.js';
import {
  type Team,
  createBoard,
  createTask,
  createTeam,
  errorCode,
} from './fixtures.js';
import { type TestApp, createTestApp, createUser, json } from './helpers.js';

describe('изменение и удаление досок', () => {
  let t: TestApp;
  let team: Team;
  let path: string;

  beforeAll(async () => {
    t = await createTestApp();
    team = await createTeam(t);
    path = `/boards/${team.boardId}`;
  });
  afterAll(async () => t?.close());

  it('сохраняет частичные изменения и показывает новое имя в списке', async () => {
    const before = await json<BoardDetail>(
      await t.request('GET', path, team.admin.token),
    );
    const changed = await t.request('PATCH', path, team.admin.token, {
      name: '  Новая команда  ',
      description: 'Описание',
    });
    expect(changed.status).toBe(200);
    expect(await json(changed)).toEqual({
      ...before,
      name: 'Новая команда',
      description: 'Описание',
    });

    const cleared = await t.request('PATCH', path, team.admin.token, {
      description: '',
    });
    expect(cleared.status).toBe(200);
    expect(await json(cleared)).toMatchObject({
      name: 'Новая команда',
      description: '',
    });
    const memberView = await t.request('GET', path, team.worker.token);
    expect(await json(memberView)).toMatchObject({
      key: before.key,
      name: 'Новая команда',
      description: '',
      myRole: 'worker',
    });
    const list = await json<BoardListResponse>(
      await t.request('GET', '/boards?q=Новая', team.worker.token),
    );
    expect(list.items).toMatchObject([
      { id: team.boardId, key: before.key, name: 'Новая команда' },
    ]);
  });

  it.each([
    {},
    { name: '  ' },
    { name: 'Новая', key: 'NEW' },
    { timezone: 'Europe/Moscow' },
    { description: 'x'.repeat(2001) },
  ])('возвращает 422 для недопустимого PATCH %#', async (body) => {
    const res = await t.request('PATCH', path, team.admin.token, body);
    expect(res.status).toBe(422);
    expect(await errorCode(res)).toBe('VALIDATION_ERROR');
  });

  it.each(['PATCH', 'DELETE'] as const)(
    '%s проверяет авторизацию и роль на доске',
    async (method) => {
      const outsider = await createUser(t);
      const body = method === 'PATCH' ? { name: 'Другое имя' } : undefined;
      expect((await t.request(method, path, null, body)).status).toBe(401);
      const hidden = await t.request(method, path, outsider.token, body);
      expect(hidden.status).toBe(404);
      expect(await errorCode(hidden)).toBe('BOARD_NOT_FOUND');
      for (const member of [team.worker, team.guest]) {
        const forbidden = await t.request(method, path, member.token, body);
        expect(forbidden.status).toBe(403);
        expect(await errorCode(forbidden)).toBe('ROLE_FORBIDDEN');
      }
    },
  );

  it('откатывает удаление доски вместе с её задачами при ошибке транзакции', async () => {
    const task = await createTask(t, team);
    vi.spyOn(taskRepo, 'notifyBoardTasksChanged').mockRejectedValueOnce(
      new Error('rollback'),
    );

    expect((await t.request('DELETE', path, team.admin.token)).status).toBe(
      500,
    );
    expect((await t.request('GET', path, team.admin.token)).status).toBe(200);
    expect(
      (await t.request('GET', `/tasks/${task.key}`, team.admin.token)).status,
    ).toBe(200);
  });

  it('удаляет доску и её данные, сохраняя связанные задачи другой доски', async () => {
    const local = await createTeam(t);
    const localPath = `/boards/${local.boardId}`;
    const other = await createBoard(t, local.admin, [
      local.worker,
      local.reviewer,
      local.tester,
    ]);
    const task = await createTask(t, local, { status: 'work' });
    const otherTask = await createTask(t, {
      ...local,
      boardId: other.id,
      boardKey: other.key,
    });
    const taskPath = `/tasks/${task.key}`;
    expect(
      (await t.request('PUT', `${localPath}/favorite`, local.admin.token))
        .status,
    ).toBe(204);
    expect(
      (await t.request('POST', `${taskPath}/pause`, local.worker.token)).status,
    ).toBe(200);
    const comment = await t.request(
      'POST',
      `${taskPath}/comments`,
      local.worker.token,
      {
        text: 'Комментарий',
      },
    );
    expect(comment.status).toBe(201);
    expect(
      (
        await t.request('POST', `${taskPath}/comments`, local.reviewer.token, {
          text: 'Ответ',
          parentId: (await json(comment)).id,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await t.request('POST', `${taskPath}/links`, local.admin.token, {
          type: 'blocks',
          targetKey: otherTask.key,
        })
      ).status,
    ).toBe(201);

    const intervals = await t.db
      .select()
      .from(taskStatusIntervals)
      .where(eq(taskStatusIntervals.taskId, task.id));
    const removed = await t.request('DELETE', localPath, local.admin.token);
    expect(removed.status).toBe(204);
    expect(await removed.text()).toBe('');
    expect((await t.request('GET', localPath, local.admin.token)).status).toBe(
      404,
    );
    expect((await t.request('GET', taskPath, local.admin.token)).status).toBe(
      404,
    );
    expect(
      (await t.request('DELETE', localPath, local.admin.token)).status,
    ).toBe(404);
    const list = await json<BoardListResponse>(
      await t.request('GET', '/boards', local.admin.token),
    );
    expect(list.items.map(({ id }) => id)).toEqual([other.id]);
    expect(
      await json(
        await t.request('GET', `/tasks/${otherTask.key}`, local.admin.token),
      ),
    ).toMatchObject({
      key: otherTask.key,
      links: [],
      linkCount: 0,
      isBlocked: false,
    });

    expect(
      await t.db
        .select()
        .from(boardMembers)
        .where(eq(boardMembers.boardId, local.boardId)),
    ).toEqual([]);
    expect(
      await t.db
        .select()
        .from(boardFavorites)
        .where(eq(boardFavorites.boardId, local.boardId)),
    ).toEqual([]);
    expect(
      await t.db
        .select()
        .from(sprints)
        .where(eq(sprints.boardId, local.boardId)),
    ).toEqual([]);
    expect(
      await t.db
        .select()
        .from(sprintTasks)
        .where(eq(sprintTasks.taskId, task.id)),
    ).toEqual([]);
    expect(
      await t.db
        .select()
        .from(taskComments)
        .where(eq(taskComments.taskId, task.id)),
    ).toEqual([]);
    expect(
      await t.db
        .select()
        .from(taskStatusIntervals)
        .where(eq(taskStatusIntervals.taskId, task.id)),
    ).toEqual([]);
    expect(
      await t.db
        .select()
        .from(taskPauses)
        .where(eq(taskPauses.intervalId, intervals[0]!.id)),
    ).toEqual([]);
    expect(
      await t.db
        .select()
        .from(notifications)
        .where(eq(notifications.boardId, local.boardId)),
    ).toEqual([]);
  });
});
