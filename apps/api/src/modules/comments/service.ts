import type { CreateCommentBody, TaskComment } from '@gwmt/contracts';

import type { AppDeps } from '../../lib/context.js';
import * as repo from './repo.js';

function toTaskComment(row: repo.CommentRow): TaskComment {
  return {
    id: row.id,
    author: row.author,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Обсуждение задачи от старых к новым — так его читают в детали. */
export async function listTaskComments(
  deps: AppDeps,
  taskId: string,
): Promise<TaskComment[]> {
  return (await repo.listTaskComments(deps.db, taskId)).map(toTaskComment);
}

/**
 * Доступ к задаче и право `task.comment` проверены роутом. Ответ — готовый
 * комментарий с автором: фронт дописывает его в деталь без перезапроса.
 */
export async function createComment(
  deps: AppDeps,
  taskId: string,
  userId: string,
  body: CreateCommentBody,
): Promise<TaskComment> {
  const id = await repo.insertComment(deps.db, {
    taskId,
    authorId: userId,
    text: body.text,
    createdAt: deps.now(),
  });
  const row = await repo.findComment(deps.db, id);
  if (!row) throw new Error('comment was not created');
  return toTaskComment(row);
}
