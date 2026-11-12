import type { BoardRole } from '@gwmt/contracts';
import { and, asc, eq, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm';

import type { Db } from '../../db/client.js';
import {
  boardFavorites,
  boardMembers,
  boards,
  sprints,
  tasks,
  users,
} from '../../db/schema.js';
import { containsPattern } from '../../lib/search.js';

export const userBriefColumns = {
  id: users.id,
  name: users.name,
  job: users.job,
  colorIndex: users.colorIndex,
};

export async function findMemberRole(db: Db, boardId: number, userId: string) {
  const [row] = await db
    .select({ role: boardMembers.role })
    .from(boardMembers)
    .where(
      and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)),
    );
  return row?.role ?? null;
}

export async function findTaskAccess(db: Db, key: string, userId: string) {
  const [row] = await db
    .select({
      id: tasks.id,
      key: tasks.key,
      boardId: tasks.boardId,
      role: boardMembers.role,
    })
    .from(tasks)
    .innerJoin(
      boardMembers,
      and(
        eq(boardMembers.boardId, tasks.boardId),
        eq(boardMembers.userId, userId),
      ),
    )
    .where(eq(tasks.key, key));
  return row ?? null;
}

export async function listBoardsForUser(
  db: Db,
  userId: string,
  filters: { q?: string | undefined; favoriteOnly: boolean },
) {
  return db
    .select({
      id: boards.id,
      key: boards.key,
      name: boards.name,
      colorIndex: boards.colorIndex,
      isFavorite: sql<boolean>`${boardFavorites.userId} is not null`,
      myRole: boardMembers.role,
      memberCount: sql<number>`(select count(*)::int from board_members bm where bm.board_id = ${boards.id})`,
      currentSprintNumber: sprints.number,
    })
    .from(boardMembers)
    .innerJoin(boards, eq(boards.id, boardMembers.boardId))
    .innerJoin(
      sprints,
      and(eq(sprints.boardId, boards.id), eq(sprints.state, 'active')),
    )
    .leftJoin(
      boardFavorites,
      and(
        eq(boardFavorites.boardId, boards.id),
        eq(boardFavorites.userId, userId),
      ),
    )
    .where(
      and(
        eq(boardMembers.userId, userId),
        filters.q
          ? or(
              ilike(boards.name, containsPattern(filters.q)),
              ilike(boards.key, containsPattern(filters.q)),
            )
          : undefined,
        filters.favoriteOnly ? isNotNull(boardFavorites.userId) : undefined,
      ),
    )
    .orderBy(asc(boards.name), asc(boards.id));
}

export async function listMembersOfBoards(db: Db, boardIds: number[]) {
  if (boardIds.length === 0) return [];
  return db
    .select({ boardId: boardMembers.boardId, ...userBriefColumns })
    .from(boardMembers)
    .innerJoin(users, eq(users.id, boardMembers.userId))
    .where(inArray(boardMembers.boardId, boardIds))
    .orderBy(asc(boardMembers.addedAt), asc(users.name));
}

export async function findBoard(db: Db, boardId: number) {
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId));
  return board ?? null;
}

export async function isFavorite(db: Db, boardId: number, userId: string) {
  const [row] = await db
    .select({ boardId: boardFavorites.boardId })
    .from(boardFavorites)
    .where(
      and(
        eq(boardFavorites.boardId, boardId),
        eq(boardFavorites.userId, userId),
      ),
    );
  return row !== undefined;
}

const boardMemberColumns = {
  ...userBriefColumns,
  email: users.email,
  role: boardMembers.role,
  addedAt: boardMembers.addedAt,
};

export async function listBoardMembers(db: Db, boardId: number) {
  return db
    .select(boardMemberColumns)
    .from(boardMembers)
    .innerJoin(users, eq(users.id, boardMembers.userId))
    .where(eq(boardMembers.boardId, boardId))
    .orderBy(asc(boardMembers.addedAt), asc(users.name));
}

export async function findBoardMember(db: Db, boardId: number, userId: string) {
  const [row] = await db
    .select(boardMemberColumns)
    .from(boardMembers)
    .innerJoin(users, eq(users.id, boardMembers.userId))
    .where(
      and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)),
    );
  return row ?? null;
}

export async function listExistingUserIds(db: Db, ids: string[]) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, ids));
  return rows.map((row) => row.id);
}

/** null значит, что ключ занят. */
export async function insertBoard(db: Db, values: typeof boards.$inferInsert) {
  const [board] = await db
    .insert(boards)
    .values(values)
    .onConflictDoNothing({ target: boards.key })
    .returning();
  return board ?? null;
}

export async function setBoardColor(
  db: Db,
  boardId: number,
  colorIndex: number,
) {
  await db.update(boards).set({ colorIndex }).where(eq(boards.id, boardId));
}

export async function insertMembers(
  db: Db,
  values: (typeof boardMembers.$inferInsert)[],
) {
  if (values.length > 0) await db.insert(boardMembers).values(values);
}

/** false значит, что человек уже на доске. */
export async function insertMember(
  db: Db,
  values: typeof boardMembers.$inferInsert,
) {
  const inserted = await db
    .insert(boardMembers)
    .values(values)
    .onConflictDoNothing()
    .returning({ userId: boardMembers.userId });
  return inserted.length > 0;
}

export async function updateMemberRole(
  db: Db,
  boardId: number,
  userId: string,
  role: BoardRole,
) {
  const updated = await db
    .update(boardMembers)
    .set({ role })
    .where(
      and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)),
    )
    .returning({ userId: boardMembers.userId });
  return updated.length > 0;
}

export async function deleteMember(db: Db, boardId: number, userId: string) {
  const deleted = await db
    .delete(boardMembers)
    .where(
      and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)),
    )
    .returning({ userId: boardMembers.userId });
  return deleted.length > 0;
}

export async function addFavorite(
  db: Db,
  boardId: number,
  userId: string,
  now: Date,
) {
  await db
    .insert(boardFavorites)
    .values({ boardId, userId, createdAt: now })
    .onConflictDoNothing();
}

export async function removeFavorite(db: Db, boardId: number, userId: string) {
  await db
    .delete(boardFavorites)
    .where(
      and(
        eq(boardFavorites.boardId, boardId),
        eq(boardFavorites.userId, userId),
      ),
    );
}
