import { notificationsResponseSchema } from '@gwmt/contracts';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { boardMembers, notifications } from '../src/db/schema.js';
import { createBoard } from './fixtures.js';
import { type TestApp, createTestApp, createUser, json } from './helpers.js';

describe('notifications', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const list = async (token: string, query = '') => {
    const response = await t.request('GET', `/notifications${query}`, token);
    expect(response.status).toBe(200);
    return notificationsResponseSchema.parse(await json(response));
  };

  it('notifies unique invited users on creation, excluding the creator', async () => {
    const owner = await createUser(t);
    const member = await createUser(t);
    const response = await t.request('POST', '/boards', owner.token, {
      key: 'NOTICE',
      name: 'Уведомления',
      memberIds: [member.id, member.id, owner.id],
    });
    expect(response.status).toBe(201);
    const board = await json(response);
    const result = await list(member.token);
    expect(result).toMatchObject({
      total: 1,
      unreadCount: 1,
      page: 1,
      pageSize: 20,
    });
    expect(result.items[0]).toMatchObject({
      type: 'board_member_added',
      boardId: board.id,
      boardName: 'Уведомления',
      readAt: null,
      createdAt: t.clock.current.toISOString(),
    });
    expect((await list(owner.token)).total).toBe(0);
  });

  it('notifies on addition, avoids duplicates, and notifies again after rejoining', async () => {
    const owner = await createUser(t);
    const member = await createUser(t);
    const board = await createBoard(t, owner);
    const add = () =>
      t.request('POST', `/boards/${board.id}/members`, owner.token, {
        userId: member.id,
      });
    expect((await add()).status).toBe(201);
    expect((await add()).status).toBe(409);
    expect((await list(member.token)).total).toBe(1);
    expect(
      (
        await t.request(
          'DELETE',
          `/boards/${board.id}/members/${member.id}`,
          owner.token,
        )
      ).status,
    ).toBe(204);
    expect((await add()).status).toBe(201);
    expect((await list(member.token)).total).toBe(2);
  });

  it('paginates in deterministic reverse order and counts unread across pages', async () => {
    const owner = await createUser(t);
    const member = await createUser(t);
    await createBoard(t, owner, [member]);
    t.advance(1000);
    await createBoard(t, owner, [member]);
    const first = await list(member.token, '?pageSize=1');
    const second = await list(member.token, '?page=2&pageSize=1');
    expect(first).toMatchObject({ total: 2, unreadCount: 2 });
    expect(first.items[0]!.createdAt > second.items[0]!.createdAt).toBe(true);
    expect(first.items[0]!.id).not.toBe(second.items[0]!.id);
    expect((await list(member.token, '?page=3&pageSize=1')).items).toEqual([]);
  });

  it('reads idempotently, reads all, deletes, and isolates every operation by user', async () => {
    const owner = await createUser(t);
    const member = await createUser(t);
    await createBoard(t, owner, [member]);
    await createBoard(t, owner, [member]);
    const id = (await list(member.token)).items[0]!.id;
    expect(
      (await t.request('PUT', `/notifications/${id}/read`, owner.token)).status,
    ).toBe(204);
    expect(
      (await t.request('DELETE', `/notifications/${id}`, owner.token)).status,
    ).toBe(204);
    expect((await list(member.token)).unreadCount).toBe(2);
    expect(
      (await t.request('PUT', `/notifications/${id}/read`, member.token))
        .status,
    ).toBe(204);
    const readAt = (await list(member.token)).items.find(
      (item) => item.id === id,
    )!.readAt;
    t.advance(1000);
    await t.request('PUT', `/notifications/${id}/read`, member.token);
    expect(
      (await list(member.token)).items.find((item) => item.id === id)!.readAt,
    ).toBe(readAt);
    expect((await list(member.token)).unreadCount).toBe(1);
    await t.request('PUT', '/notifications/read', owner.token);
    expect((await list(member.token)).unreadCount).toBe(1);
    await t.request('PUT', '/notifications/read', member.token);
    expect((await list(member.token)).unreadCount).toBe(0);
    await t.request('DELETE', `/notifications/${id}`, member.token);
    expect((await list(member.token)).total).toBe(1);
  });

  it('rolls back membership if the notification cannot be saved', async () => {
    const owner = await createUser(t);
    const member = await createUser(t);
    const board = await createBoard(t, owner);
    await t.db.execute(
      sql`alter table notifications add constraint test_reject_notification check (board_id <> ${sql.raw(String(board.id))})`,
    );
    try {
      expect(
        (
          await t.request('POST', `/boards/${board.id}/members`, owner.token, {
            userId: member.id,
          })
        ).status,
      ).toBe(500);
      const rows = await t.db
        .select()
        .from(boardMembers)
        .where(eq(boardMembers.userId, member.id));
      expect(rows).toEqual([]);
      expect((await list(member.token)).total).toBe(0);
    } finally {
      await t.db.execute(
        sql`alter table notifications drop constraint test_reject_notification`,
      );
    }
  });

  it('requires authentication and validates pagination and UUIDs', async () => {
    const member = await createUser(t);
    for (const [method, path] of [
      ['GET', '/notifications'],
      ['PUT', '/notifications/read'],
      ['PUT', '/notifications/00000000-0000-4000-8000-000000000001/read'],
      ['DELETE', '/notifications/00000000-0000-4000-8000-000000000001'],
    ]) {
      expect((await t.request(method!, path!)).status).toBe(401);
    }
    for (const query of [
      '?page=0',
      '?page=-1',
      '?page=1.5',
      '?pageSize=101',
      '?pageSize=0',
    ]) {
      expect(
        (await t.request('GET', `/notifications${query}`, member.token)).status,
      ).toBe(422);
    }
    expect(
      (await t.request('PUT', '/notifications/bad/read', member.token)).status,
    ).toBe(400);
    expect(
      (await t.request('DELETE', '/notifications/bad', member.token)).status,
    ).toBe(400);
    expect(
      await t.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, member.id)),
    ).toEqual([]);
  });
});
