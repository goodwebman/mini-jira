import { asc, eq } from 'drizzle-orm';

import type { Db } from '../../db/client.js';
import { taskComments, users } from '../../db/schema.js';
import { userBriefColumns } from '../boards/repo.js';

const commentColumns = {
  id: taskComments.id,
  taskId: taskComments.taskId,
  parentId: taskComments.parentId,
  text: taskComments.text,
  createdAt: taskComments.createdAt,
  author: userBriefColumns,
};

export type CommentRow = Awaited<ReturnType<typeof listTaskComments>>[number];

export function listTaskComments(db: Db, taskId: string) {
  return db
    .select(commentColumns)
    .from(taskComments)
    .innerJoin(users, eq(users.id, taskComments.authorId))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt), asc(taskComments.id));
}

export async function findComment(db: Db, commentId: string) {
  const [row] = await db
    .select(commentColumns)
    .from(taskComments)
    .innerJoin(users, eq(users.id, taskComments.authorId))
    .where(eq(taskComments.id, commentId))
    .limit(1);
  return row;
}

export async function insertComment(
  db: Db,
  values: typeof taskComments.$inferInsert,
): Promise<string> {
  const [comment] = await db
    .insert(taskComments)
    .values(values)
    .returning({ id: taskComments.id });
  if (!comment) throw new Error('comment was not created');
  return comment.id;
}
