import { and, eq, isNull, ne, sql } from 'drizzle-orm';

import type { Db } from '../../db/client.js';
import {
  authSessions,
  authThrottle,
  refreshTokens,
  users,
} from '../../db/schema.js';

type NewUser = typeof users.$inferInsert;
type NewSession = typeof authSessions.$inferInsert;

export async function findUserById(db: Db, id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}

export async function findUserByEmail(db: Db, email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user ?? null;
}

export async function findUserByGithubId(db: Db, githubId: number) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.githubId, githubId));
  return user ?? null;
}

/** null значит, что email уже занят. */
export async function insertUser(db: Db, values: NewUser) {
  const [user] = await db
    .insert(users)
    .values(values)
    .onConflictDoNothing({ target: users.email })
    .returning();
  return user ?? null;
}

export async function findUserByGoogleId(db: Db, googleId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.googleId, googleId));
  return user ?? null;
}

export async function linkOAuthAccount(
  db: Db,
  userId: string,
  provider: { githubId: number } | { googleId: string },
  now: Date,
) {
  const [user] = await db
    .update(users)
    .set({ ...provider, passwordHash: null, updatedAt: now })
    .where(eq(users.id, userId))
    .returning();
  return user ?? null;
}

export async function insertSession(db: Db, values: NewSession) {
  const [session] = await db.insert(authSessions).values(values).returning();
  if (!session) throw new Error('session was not created');
  return session;
}

export async function insertRefreshToken(
  db: Db,
  sessionId: string,
  tokenHash: string,
  createdAt: Date,
) {
  await db.insert(refreshTokens).values({ sessionId, tokenHash, createdAt });
}

export async function findRefreshToken(db: Db, tokenHash: string) {
  const [row] = await db
    .select({
      id: refreshTokens.id,
      usedAt: refreshTokens.usedAt,
      sessionId: authSessions.id,
      userId: authSessions.userId,
      remember: authSessions.remember,
      expiresAt: authSessions.expiresAt,
      revokedAt: authSessions.revokedAt,
    })
    .from(refreshTokens)
    .innerJoin(authSessions, eq(authSessions.id, refreshTokens.sessionId))
    .where(eq(refreshTokens.tokenHash, tokenHash));
  return row ?? null;
}

/** Атомарный захват токена: true получает ровно один из параллельных запросов. */
export async function markRefreshTokenUsed(db: Db, id: string, now: Date) {
  const updated = await db
    .update(refreshTokens)
    .set({ usedAt: now })
    .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.usedAt)))
    .returning({ id: refreshTokens.id });
  return updated.length > 0;
}

export async function getRefreshTokenUsedAt(db: Db, id: string) {
  const [row] = await db
    .select({ usedAt: refreshTokens.usedAt })
    .from(refreshTokens)
    .where(eq(refreshTokens.id, id));
  return row?.usedAt ?? null;
}

export async function extendSession(
  db: Db,
  sessionId: string,
  expiresAt: Date,
  now: Date,
) {
  await db
    .update(authSessions)
    .set({ expiresAt, lastUsedAt: now })
    .where(eq(authSessions.id, sessionId));
}

export async function revokeSession(db: Db, sessionId: string, now: Date) {
  await db
    .update(authSessions)
    .set({ revokedAt: now })
    .where(and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)));
}

export async function revokeUserSessions(
  db: Db,
  userId: string,
  now: Date,
  exceptSessionId?: string,
) {
  await db
    .update(authSessions)
    .set({ revokedAt: now })
    .where(
      and(
        eq(authSessions.userId, userId),
        isNull(authSessions.revokedAt),
        exceptSessionId ? ne(authSessions.id, exceptSessionId) : undefined,
      ),
    );
}

export async function findThrottle(db: Db, key: string) {
  const [row] = await db
    .select()
    .from(authThrottle)
    .where(eq(authThrottle.key, key));
  return row ?? null;
}

/** Считает неудачу одним запросом, чтобы параллельные попытки не потеряли инкремент. */
export async function recordLoginFailure(
  db: Db,
  key: string,
  now: Date,
  windowStart: Date,
  maxFails: number,
  lockedUntil: Date,
) {
  const stale = sql`${authThrottle.windowStartedAt} <= ${windowStart.toISOString()}::timestamptz`;
  const nextFails = sql`case when ${stale} then 1 else ${authThrottle.fails} + 1 end`;
  await db
    .insert(authThrottle)
    .values({ key, fails: 1, windowStartedAt: now })
    .onConflictDoUpdate({
      target: authThrottle.key,
      set: {
        fails: nextFails,
        windowStartedAt: sql`case when ${stale} then ${now.toISOString()}::timestamptz else ${authThrottle.windowStartedAt} end`,
        lockedUntil: sql`case when ${nextFails} >= ${maxFails} then ${lockedUntil.toISOString()}::timestamptz else null end`,
      },
    });
}

export async function clearThrottle(db: Db, key: string) {
  await db.delete(authThrottle).where(eq(authThrottle.key, key));
}
