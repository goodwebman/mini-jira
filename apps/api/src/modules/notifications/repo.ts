import { and, count, eq, isNull, sql } from 'drizzle-orm';

import type { Db } from '../../db/client.js';
import { notifications } from '../../db/schema.js';

export async function list(
  db: Db,
  userId: string,
  page: number,
  pageSize: number,
) {
  // One statement keeps the counter and page consistent during concurrent reads.
  const [result] = await db
    .select({
      total: count(),
      unreadCount: sql<number>`count(*) filter (where ${notifications.readAt} is null)::int`,
      items: sql<
        {
          id: string;
          type: 'board_member_added';
          boardId: number;
          boardName: string;
          createdAt: string;
          readAt: null | string;
        }[]
      >`coalesce((select json_agg(n) from (
      select id, type, board_id as "boardId", board_name as "boardName",
        created_at as "createdAt", read_at as "readAt"
      from notifications where user_id = ${userId}
      order by created_at desc, id desc limit ${pageSize} offset ${(page - 1) * pageSize}
    ) n), '[]'::json)`,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId));
  return result!;
}

export async function insertBoardInvitations(
  db: Db,
  userIds: string[],
  board: { id: number; name: string },
  now: Date,
) {
  if (userIds.length === 0) return;
  await db.insert(notifications).values(
    userIds.map((userId) => ({
      userId,
      type: 'board_member_added' as const,
      boardId: board.id,
      boardName: board.name,
      createdAt: now,
    })),
  );
}

export async function markRead(db: Db, userId: string, now: Date, id?: string) {
  await db
    .update(notifications)
    .set({ readAt: now })
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        id ? eq(notifications.id, id) : undefined,
      ),
    );
}

export async function remove(db: Db, userId: string, id: string) {
  await db
    .delete(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.id, id)));
}
