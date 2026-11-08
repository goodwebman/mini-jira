import { and, asc, eq, ilike, inArray, ne, notInArray, or } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { boardMembers, users } from '../../db/schema.js';
import { containsPattern } from '../../lib/search.js';
import { userBriefColumns } from '../boards/repo.js';

const SEARCH_LIMIT = 20;

export async function searchUsers(
  db: Db,
  userId: string,
  query: { q: string; excludeBoardId?: number | undefined },
) {
  const { q, excludeBoardId } = query;
  const excludeMembers =
    excludeBoardId === undefined
      ? undefined
      : notInArray(
          users.id,
          db
            .select({ id: boardMembers.userId })
            .from(boardMembers)
            .where(eq(boardMembers.boardId, excludeBoardId)),
        );

  const myBoards = db
    .select({ id: boardMembers.boardId })
    .from(boardMembers)
    .where(eq(boardMembers.userId, userId));

  const matches = q
    ? or(ilike(users.name, containsPattern(q)), eq(users.email, q))
    : inArray(
        users.id,
        db
          .select({ id: boardMembers.userId })
          .from(boardMembers)
          .where(inArray(boardMembers.boardId, myBoards)),
      );

  return db
    .select(userBriefColumns)
    .from(users)
    .where(and(ne(users.id, userId), matches, excludeMembers))
    .orderBy(asc(users.name))
    .limit(SEARCH_LIMIT);
}
