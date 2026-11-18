import { eq } from 'drizzle-orm';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  notifications,
  sprintTasks,
  taskComments,
  taskPauses,
  taskStatusIntervals,
  tasks,
} from '../src/db/schema.js';
import * as repo from '../src/modules/tasks/repo.js';
import { type Team, createTask, createTeam, errorCode } from './fixtures.js';
import { type TestApp, createTestApp, createUser, json } from './helpers.js';

describe('CRUD задачи', () => {
  let t: TestApp;
  let team: Team;
  beforeAll(async () => {
    t = await createTestApp();
    team = await createTeam(t);
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(() => t.close());

  it('сохраняет название, пустое описание, свойства и людей; неверный PATCH атомарен', async () => {
    const task = await createTask(t, team, { description: 'Старое описание' });
    const path = `/tasks/${task.key}`;
    expect(
      (
        await t.request('PATCH', path, team.admin.token, {
          title: '  Новое название  ',
          description: '',
          priority: 'high',
          sp: 2.5,
          authorId: team.reviewer.id,
          reviewerId: team.worker.id,
          testerId: null,
          designerId: team.tester.id,
        })
      ).status,
    ).toBe(200);
    const detail = await json(await t.request('GET', path, team.admin.token));
    expect(detail).toMatchObject({
      title: 'Новое название',
      description: '',
      priority: 'high',
      sp: 2.5,
      people: {
        author: { id: team.reviewer.id },
        reviewer: { id: team.worker.id },
        tester: null,
        designer: { id: team.tester.id },
      },
    });
    const invalid = await t.request('PATCH', path, team.admin.token, {
      title: '   ',
      description: 'Не сохранять',
    });
    expect(invalid.status).toBe(422);
    expect(
      await json(await t.request('GET', path, team.admin.token)),
    ).toMatchObject({ title: detail.title, description: '' });
  });

  it.each(['worker', 'guest'] as const)(
    '%s не может редактировать текст или удалить задачу',
    async (role) => {
      const task = await createTask(t, team);
      const path = `/tasks/${task.key}`;
      for (const method of ['PATCH', 'DELETE']) {
        const res = await t.request(
          method,
          path,
          team[role].token,
          method === 'PATCH' ? { title: 'Другое' } : undefined,
        );
        expect(res.status).toBe(403);
        expect(await errorCode(res)).toBe('ROLE_FORBIDDEN');
      }
      expect((await t.request('GET', path, team.admin.token)).status).toBe(200);
    },
  );

  it('удаление требует авторизацию и скрывает чужую или отсутствующую задачу', async () => {
    const task = await createTask(t, team);
    const outsider = await createUser(t);
    expect((await t.request('DELETE', `/tasks/${task.key}`)).status).toBe(401);
    const res = await t.request('DELETE', `/tasks/${task.key}`, outsider.token);
    expect(res.status).toBe(404);
    expect(await errorCode(res)).toBe('TASK_NOT_FOUND');
    expect(
      (
        await t.request(
          'DELETE',
          `/tasks/${team.boardKey}-99999`,
          team.admin.token,
        )
      ).status,
    ).toBe(404);
    expect(
      (await t.request('DELETE', '/tasks/invalid', team.admin.token)).status,
    ).toBe(400);
  });

  it('удаляет задачу вместе с обсуждением, историей, паузами, спринтами, связями и уведомлениями', async () => {
    const local = await createTeam(t);
    const task = await createTask(t, local, { status: 'work' });
    const blocked = await createTask(t, local);
    const path = `/tasks/${task.key}`;
    expect(
      (await t.request('POST', `${path}/pause`, local.worker.token)).status,
    ).toBe(200);
    const comment = await json(
      await t.request('POST', `${path}/comments`, local.worker.token, {
        text: 'Комментарий',
      }),
    );
    expect(
      (
        await t.request('POST', `${path}/comments`, local.reviewer.token, {
          text: 'Ответ',
          parentId: comment.id,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await t.request('POST', `${path}/links`, local.admin.token, {
          type: 'blocks',
          targetKey: blocked.key,
        })
      ).status,
    ).toBe(201);
    const intervals = await t.db
      .select()
      .from(taskStatusIntervals)
      .where(eq(taskStatusIntervals.taskId, task.id));
    expect(intervals.length).toBeGreaterThan(0);
    expect(
      (
        await t.db
          .select()
          .from(notifications)
          .where(eq(notifications.taskKey, task.key))
      ).length,
    ).toBeGreaterThan(0);
    const res = await t.request('DELETE', path, local.admin.token);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect((await t.request('GET', path, local.admin.token)).status).toBe(404);
    expect((await t.request('DELETE', path, local.admin.token)).status).toBe(
      404,
    );
    expect(
      await t.db.select().from(tasks).where(eq(tasks.id, task.id)),
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
        .from(sprintTasks)
        .where(eq(sprintTasks.taskId, task.id)),
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
        .where(eq(notifications.taskKey, task.key)),
    ).toEqual([]);
    expect(
      await json(
        await t.request('GET', `/tasks/${blocked.key}`, local.admin.token),
      ),
    ).toMatchObject({ links: [], linkCount: 0, isBlocked: false });
    const board = await json(
      await t.request(
        'GET',
        `/boards/${local.boardId}/tasks`,
        local.admin.token,
      ),
    );
    expect(board.items.map((item: { key: string }) => item.key)).toEqual([
      blocked.key,
    ]);
    const mine = await json(
      await t.request('GET', '/me/tasks', local.worker.token),
    );
    expect(mine.items.map((item: { key: string }) => item.key)).toEqual([
      blocked.key,
    ]);
    const next = await createTask(t, local);
    expect(Number(next.key.split('-')[1])).toBeGreaterThan(
      Number(blocked.key.split('-')[1]),
    );
  });

  it('откатывает всё удаление при ошибке транзакции', async () => {
    const task = await createTask(t, team);
    vi.spyOn(repo, 'notifyBoardTasksChanged').mockRejectedValueOnce(
      new Error('rollback'),
    );
    expect(
      (await t.request('DELETE', `/tasks/${task.key}`, team.admin.token))
        .status,
    ).toBe(500);
    expect(
      (await t.request('GET', `/tasks/${task.key}`, team.admin.token)).status,
    ).toBe(200);
    expect(
      await t.db
        .select()
        .from(sprintTasks)
        .where(eq(sprintTasks.taskId, task.id)),
    ).toHaveLength(1);
    expect(
      await t.db
        .select()
        .from(taskStatusIntervals)
        .where(eq(taskStatusIntervals.taskId, task.id)),
    ).toHaveLength(1);
  });
});
