import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { boards, sprints, taskLinks, tasks, users } from '../src/db/schema.js';
import { createTestApp, createUser, type TestApp } from './helpers.js';

describe('схема БД', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(() => t.close());

  it('расширения включены первой миграцией', async () => {
    const result = await t.db.execute(sql`select extname from pg_extension order by extname`);
    const names = (result as unknown as { rows: { extname: string }[] }).rows.map((r) => r.extname);
    expect(names).toEqual(expect.arrayContaining(['citext', 'pg_trgm']));
  });

  it('email уникален без учёта регистра', async () => {
    await createUser(t, { email: 'Same@Example.com' });
    await expect(createUser(t, { email: 'same@example.COM' })).rejects.toThrow();
  });

  describe('с доской', () => {
    let boardId: number;
    let userId: string;

    beforeAll(async () => {
      const user = await createUser(t);
      userId = user.id;
      const [board] = await t.db
        .insert(boards)
        .values({ key: 'SCH', name: 'Схема', colorIndex: 0, timezone: 'Europe/Moscow', createdBy: user.id })
        .returning();
      boardId = board!.id;
    });

    const sprint = (number: number, state: 'active' | 'closed') => ({
      boardId,
      number,
      startDate: '2026-11-02',
      endDate: '2026-11-13',
      state,
    });

    it('активный спринт на доске один', async () => {
      await t.db.insert(sprints).values(sprint(1, 'active'));
      await expect(t.db.insert(sprints).values(sprint(2, 'active'))).rejects.toThrow();
      await expect(t.db.insert(sprints).values(sprint(2, 'closed'))).resolves.toBeDefined();
    });

    it('task_seq стартует со 100', async () => {
      const [row] = await t.db.select({ taskSeq: boards.taskSeq }).from(boards).limit(1);
      expect(row?.taskSeq).toBe(100);
    });

    it('sp приходит числом, связь сама на себя запрещена', async () => {
      const [active] = await t.db.select().from(sprints).where(sql`${sprints.state} = 'active'`);
      const [task] = await t.db
        .insert(tasks)
        .values({
          boardId,
          number: 101,
          key: 'SCH-101',
          sprintId: active!.id,
          title: 'Задача',
          priority: 'med',
          sp: 2.5,
          status: 'todo',
          authorId: userId,
          reviewerId: userId,
          createdBy: userId,
          statusEnteredAt: t.clock.current,
        })
        .returning();
      expect(task?.sp).toBe(2.5);
      await expect(
        t.db.insert(taskLinks).values({ taskId: task!.id, targetTaskId: task!.id, type: 'rel' }),
      ).rejects.toThrow();
    });
  });

  it('users без пароля и GitHub допустимы', async () => {
    const user = await createUser(t);
    const [row] = await t.db.select().from(users).where(sql`${users.id} = ${user.id}`);
    expect(row?.passwordHash).toBeNull();
    expect(row?.githubId).toBeNull();
    expect(row?.job).toBe('');
    expect(row?.timezone).toBe('Europe/Moscow');
  });
});
