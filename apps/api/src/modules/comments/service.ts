import type { CreateCommentBody, TaskComment } from '@gwmt/contracts';

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
    const task = await tasksRepo.findTask(tx, taskId);
    if (!task) throw new AppError('TASK_NOT_FOUND');
    const parent = body.parentId
      ? await repo.findComment(tx, body.parentId)
      : undefined;
    if (body.parentId && parent?.taskId !== taskId) {
      throw new AppError('VALIDATION_ERROR', {
        fields: { parentId: 'Комментарий не найден в этой задаче' },
      });
    }
    const mentions = body.mentions ?? [];
    if (mentions.length > 0) {
      const members = await boardsRepo.listBoardMembers(tx, task.boardId);
      for (const mention of mentions) {
        const member = members.find(
          (candidate) => candidate.id === mention.userId,
        );
        if (
          !member ||
          body.text.slice(mention.start, mention.end) !== `@${member.name}`
        ) {
          throw new AppError('VALIDATION_ERROR', {
            fields: {
              mentions: 'Упоминать можно только участников этой доски',
            },
          });
        }
      }
    }
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
