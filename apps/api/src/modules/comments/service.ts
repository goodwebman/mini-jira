import {
  type BoardRole,
  type CreateCommentBody,
  type TaskComment,
  type UpdateCommentBody,
  getCommentPermissions,
} from '@gwmt/contracts';

import type { Db } from '../../db/client.js';
import type { AppDeps } from '../../lib/context.js';
import { AppError } from '../../lib/errors.js';
import * as boardsRepo from '../boards/repo.js';
import { taskParticipants } from '../notifications/events.js';
import type { TaskNotice } from '../notifications/events.js';
import { notifyTaskRecipients } from '../notifications/service.js';
import * as tasksRepo from '../tasks/repo.js';
import * as repo from './repo.js';

function toTaskComment(row: repo.CommentRow): TaskComment {
  return {
    id: row.id,
    parentId: row.parentId,
    author: row.author,
    text: row.text,
    ...(row.mentions.length > 0 ? { mentions: row.mentions } : {}),
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

async function assertMentions(
  db: Db,
  boardId: number,
  body: UpdateCommentBody,
  previous?: repo.CommentRow,
) {
  if (!body.mentions?.length) return;
  const members = await boardsRepo.listBoardMembers(db, boardId);
  for (const mention of body.mentions) {
    // Сохранённая подпись остаётся допустимой после переименования или ухода участника.
    if (
      previous?.mentions.some(
        (saved) =>
          saved.userId === mention.userId &&
          previous.text.slice(saved.start, saved.end) ===
            body.text.slice(mention.start, mention.end),
      )
    )
      continue;
    const member = members.find((candidate) => candidate.id === mention.userId);
    if (
      !member ||
      body.text.slice(mention.start, mention.end) !== `@${member.name}`
    ) {
      throw new AppError('VALIDATION_ERROR', {
        fields: { mentions: 'Упоминать можно только участников этой доски' },
      });
    }
  }
}

async function requireCommentPermission(
  db: Db,
  taskId: string,
  commentId: string,
  userId: string,
  role: BoardRole,
  action: 'canDelete' | 'canEdit',
) {
  const locked = await tasksRepo.lockTask(db, taskId);
  if (!locked) throw new AppError('TASK_NOT_FOUND');
  const comment = await repo.findComment(db, commentId);
  if (!comment || comment.taskId !== taskId)
    throw new AppError('COMMENT_NOT_FOUND');
  if (!getCommentPermissions(role, userId, comment.author.id)[action])
    throw new AppError('ROLE_FORBIDDEN');
  return { comment, task: locked.task };
}

export async function updateComment(
  deps: AppDeps,
  taskId: string,
  commentId: string,
  userId: string,
  role: BoardRole,
  body: UpdateCommentBody,
): Promise<TaskComment> {
  return deps.withTx(async (tx) => {
    const { task, comment } = await requireCommentPermission(
      tx,
      taskId,
      commentId,
      userId,
      role,
      'canEdit',
    );
    await assertMentions(tx, task.boardId, body, comment);
    await repo.updateComment(tx, commentId, {
      text: body.text,
      mentions: body.mentions ?? [],
    });
    const mentioned = new Set(
      comment.mentions.map((mention) => mention.userId),
    );
    const notices = new Map<string, TaskNotice>();
    for (const mention of body.mentions ?? []) {
      if (!mentioned.has(mention.userId))
        notices.set(mention.userId, {
          type: 'comment_mention',
          message: 'Вас упомянули в комментарии',
        });
    }
    await notifyTaskRecipients(
      tx,
      task,
      userId,
      notices,
      deps.now(),
      commentId,
    );
    const updated = await repo.findComment(tx, commentId);
    if (!updated) throw new AppError('COMMENT_NOT_FOUND');
    return toTaskComment(updated);
  });
}

export async function deleteComment(
  deps: AppDeps,
  taskId: string,
  commentId: string,
  userId: string,
  role: BoardRole,
): Promise<void> {
  await deps.withTx(async (tx) => {
    const { comment } = await requireCommentPermission(
      tx,
      taskId,
      commentId,
      userId,
      role,
      'canDelete',
    );
    await repo.deleteComment(tx, comment);
  });
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
  return deps.withTx(async (tx) => {
    const locked = await tasksRepo.lockTask(tx, taskId);
    if (!locked) throw new AppError('TASK_NOT_FOUND');
    const { task } = locked;
    const parent = body.parentId
      ? await repo.findComment(tx, body.parentId)
      : undefined;
    if (body.parentId && parent?.taskId !== taskId) {
      throw new AppError('VALIDATION_ERROR', {
        fields: { parentId: 'Комментарий не найден в этой задаче' },
      });
    }
    const mentions = body.mentions ?? [];
    await assertMentions(tx, task.boardId, body);
    const now = deps.now();
    const id = await repo.insertComment(tx, {
      taskId,
      parentId: body.parentId,
      authorId: userId,
      text: body.text,
      mentions,
      createdAt: now,
    });
    const notices = new Map<string, TaskNotice>(
      taskParticipants(task).map((id) => [
        id,
        { type: 'comment_added', message: 'Новый комментарий к задаче' },
      ]),
    );
    if (parent)
      notices.set(parent.author.id, {
        type: 'comment_reply',
        message: 'Ответ на ваш комментарий',
      });
    for (const mention of mentions)
      notices.set(mention.userId, {
        type: 'comment_mention',
        message: 'Вас упомянули в комментарии',
      });
    await notifyTaskRecipients(tx, task, userId, notices, now, id);
    const row = await repo.findComment(tx, id);
    if (!row) throw new Error('comment was not created');
    return toTaskComment(row);
  });
}
