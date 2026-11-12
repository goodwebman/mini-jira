import {
  boardTasksResponseSchema,
  myTasksResponseSchema,
  sprintKpiSchema,
  taskDetailSchema,
} from '@gwmt/contracts';
import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  boardFavorites,
  boardMembers,
  boards,
  sprintTasks,
  sprints,
  taskComments,
  taskLinks,
  tasks,
  users,
} from '../src/db/schema.js';
import { assertSeedAllowed, seedDatabase } from '../src/db/seed.js';
import { hashPassword } from '../src/lib/password.js';
import { type TestApp, createTestApp, json, signedPost } from './helpers.js';

const NOW = new Date('2026-11-11T09:00:00.000Z');

describe('сид', () => {
  let t: TestApp;
  let passwordHash: string;

  const runSeed = () =>
    t.db.transaction((tx) => seedDatabase(tx, NOW, passwordHash));

  const counts = async () => {
    const count = async (table: Parameters<typeof t.db.$count>[0]) =>
      t.db.$count(table);
    return {
      users: await count(users),
      boards: await count(boards),
      members: await count(boardMembers),
      favorites: await count(boardFavorites),
      sprints: await count(sprints),
      tasks: await count(tasks),
      sprintTasks: await count(sprintTasks),
      links: await count(taskLinks),
      comments: await count(taskComments),
    };
  };

  const login = async (email: string) => {
    const res = await signedPost(t, '/auth/login', {
      email,
      password: 'password',
      remember: false,
    });
    expect(res.status).toBe(200);
    return (await json(res)).accessToken as string;
  };

  beforeAll(async () => {
    t = await createTestApp(NOW);
    passwordHash = await hashPassword('password');
    await runSeed();
  });

  afterAll(() => t.close());

  it('отказывается работать в production', () => {
    expect(() => assertSeedAllowed('production')).toThrow('production');
    expect(() => assertSeedAllowed('development')).not.toThrow();
  });

  it('создаёт 10 людей и 8 досок', async () => {
    const before = await counts();
    expect(before.users).toBe(10);
    expect(before.boards).toBe(8);
  });

  it('идемпотентен', async () => {
    const first = await counts();
    const [anna] = await t.db
      .select()
      .from(users)
      .where(eq(users.email, 'anna@example.com'));
    await runSeed();
    expect(await counts()).toEqual(first);
    const [again] = await t.db
      .select()
      .from(users)
      .where(eq(users.email, 'anna@example.com'));
    expect(again?.id).toBe(anna?.id);
  });

  it('детерминирован при той же дате', async () => {
    const titles = () =>
      t.db
        .select({ key: tasks.key, title: tasks.title, status: tasks.status })
        .from(tasks)
        .orderBy(tasks.key);
    const first = await titles();
    await runSeed();
    expect(await titles()).toEqual(first);
  });

  it('роли на GWT как в контракте', async () => {
    const role = async (email: string) => {
      const [row] = await t.db
        .select({ role: boardMembers.role })
        .from(boardMembers)
        .innerJoin(users, eq(users.id, boardMembers.userId))
        .where(and(eq(boardMembers.boardId, 9), eq(users.email, email)));
      return row?.role;
    };
    expect(await role('anna@example.com')).toBe('admin');
    expect(await role('dmitry@example.com')).toBe('worker');
    expect(await role('viktoria@example.com')).toBe('guest');
  });

  it('у Анны в избранном GWT и MOB', async () => {
    const token = await login('anna@example.com');
    const favorites = await json(
      await t.request('GET', '/boards?filter=favorite', token),
    );
    expect(favorites.items.map((b: { key: string }) => b.key).sort()).toEqual([
      'GWT',
      'MOB',
    ]);
  });

  it('текущие спринты и до 6 закрытых', async () => {
    const token = await login('anna@example.com');
    const { items } = await json(await t.request('GET', '/boards', token));
    const byKey = Object.fromEntries(
      items.map((b: { key: string; currentSprintNumber: number }) => [
        b.key,
        b.currentSprintNumber,
      ]),
    );
    expect(byKey).toMatchObject({ GWT: 14, FRONT: 9, DES: 6, MOB: 11, HOT: 5 });

    const gwt = await json(
      await t.request('GET', '/boards/9/sprints?limit=20', token),
    );
    expect(gwt.items).toHaveLength(7);
    expect(gwt.items[0]).toMatchObject({ number: 14, state: 'active' });
    expect(gwt.items.at(-1)).toMatchObject({ number: 8, state: 'closed' });

    const hot = await json(
      await t.request('GET', '/boards/48/sprints?limit=20', token),
    );
    expect(hot.items).toHaveLength(5);
  });

  it('на старте спринта 13-18 задач', async () => {
    const rows = await t.db
      .select({
        sprintId: sprintTasks.sprintId,
        count: sql<number>`count(*)::int`,
      })
      .from(sprintTasks)
      .groupBy(sprintTasks.sprintId);
    for (const row of rows) {
      expect(row.count).toBeGreaterThanOrEqual(13);
      expect(row.count).toBeLessThanOrEqual(18);
    }
  });

  it('гости на задачи не назначены', async () => {
    const [victoria] = await t.db
      .select()
      .from(users)
      .where(eq(users.email, 'viktoria@example.com'));
    const gwtTasks = await t.db
      .select()
      .from(tasks)
      .where(eq(tasks.boardId, 9));
    expect(gwtTasks.length).toBeGreaterThan(0);
    for (const task of gwtTasks) {
      expect([
        task.authorId,
        task.reviewerId,
        task.testerId,
        task.designerId,
      ]).not.toContain(victoria?.id);
    }
  });

  it('на GWT есть задача в todo с запретом и без', async () => {
    const token = await login('anna@example.com');
    const { items } = await json(
      await t.request('GET', '/boards/9/tasks', token),
    );
    const todo = items.filter(
      (item: { status: string }) => item.status === 'todo',
    );
    expect(
      todo.some((item: { isTakeLocked: boolean }) => item.isTakeLocked),
    ).toBe(true);
    expect(
      todo.some((item: { isTakeLocked: boolean }) => !item.isTakeLocked),
    ).toBe(true);
  });

  it('запрет только у задач в todo', async () => {
    const rows = await t.db
      .select()
      .from(tasks)
      .where(eq(tasks.takeLocked, true));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.status === 'todo')).toBe(true);
  });

  it('связи парные', async () => {
    const rows = await t.db.select().from(taskLinks);
    expect(rows.length).toBeGreaterThan(0);
    const pairs = new Set(
      rows.map((row) => `${row.taskId}:${row.targetTaskId}`),
    );
    for (const row of rows)
      expect(pairs.has(`${row.targetTaskId}:${row.taskId}`)).toBe(true);
  });

  it('снимок закрытого спринта читается и совпадает с контрактом', async () => {
    const token = await login('anna@example.com');
    const kpi = sprintKpiSchema.parse(
      await json(await t.request('GET', '/boards/9/sprints/13/kpi', token)),
    );
    expect(kpi.isEmpty).toBe(false);
    expect(kpi.sprint).toMatchObject({
      number: 13,
      state: 'closed',
      todayIndex: 9,
    });
    expect(kpi.summary.doneSp).toBeGreaterThan(0);
    expect(kpi.team.length).toBeGreaterThan(0);
    expect(kpi.velocity.items.at(-1)?.number).toBe(13);
  });

  it('KPI активного спринта считается на сидовых данных', async () => {
    const token = await login('dmitry@example.com');
    const kpi = sprintKpiSchema.parse(
      await json(await t.request('GET', '/boards/9/sprints/14/kpi', token)),
    );
    expect(kpi.sprint.state).toBe('active');
    expect(JSON.stringify(kpi)).not.toContain('NaN');
    expect(kpi.velocity.items.map((item) => item.number)).toEqual([
      9, 10, 11, 12, 13, 14,
    ]);
  });

  it('после сида последовательность boards.id не конфликтует', async () => {
    const token = await login('anna@example.com');
    const res = await t.request('POST', '/boards', token, {
      name: 'После сида',
      key: 'NEW',
      memberIds: [],
    });
    expect(res.status).toBe(201);
    expect((await json(res)).id).toBe(49);
  });

  it('номера задач идут со 101 и task_seq совпадает с максимумом', async () => {
    const [row] = await t.db
      .select({
        min: sql<number>`min(${tasks.number})::int`,
        max: sql<number>`max(${tasks.number})::int`,
      })
      .from(tasks)
      .where(eq(tasks.boardId, 9));
    const [board] = await t.db.select().from(boards).where(eq(boards.id, 9));
    expect(row?.min).toBe(101);
    expect(board?.taskSeq).toBe(row?.max);
  });

  it('все сидовые задачи доступны через ручку и проходят схему контракта', async () => {
    const token = await login('anna@example.com');
    const mine = myTasksResponseSchema.parse(
      await json(await t.request('GET', '/me/tasks?pageSize=100', token)),
    );
    expect(mine.items.length).toBeGreaterThan(0);
    const board = boardTasksResponseSchema.parse(
      await json(await t.request('GET', '/boards/9/tasks', token)),
    );
    const detail = taskDetailSchema.parse(
      await json(
        await t.request('GET', `/tasks/${board.items[0]?.key}`, token),
      ),
    );
    expect(detail.board.key).toBe('GWT');
  });
});
