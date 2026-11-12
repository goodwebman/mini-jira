import { eq } from 'drizzle-orm';

import type { Db } from '../../db/client.js';
import { users } from '../../db/schema.js';

export async function updateUser(
  db: Db,
  userId: string,
  values: Partial<typeof users.$inferInsert>,
) {
  const [user] = await db
    .update(users)
    .set(values)
    .where(eq(users.id, userId))
    .returning();
  return user ?? null;
}

export async function setPasswordHash(
  db: Db,
  userId: string,
  passwordHash: string,
  now: Date,
) {
  await db
    .update(users)
    .set({ passwordHash, updatedAt: now })
    .where(eq(users.id, userId));
}
