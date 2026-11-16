import type {
  BoardRole,
  NotificationType,
  NotificationsResponse,
} from '@gwmt/contracts';
import { BOARD_ROLE_LABELS } from '@gwmt/contracts';

import type { Db } from '../../db/client.js';
import type { TaskRow } from '../../db/schema.js';
import type { AppDeps } from '../../lib/context.js';
import {
  type TaskNotice,
  taskChangeNotices,
  taskParticipants,
} from './events.js';
import * as repo from './repo.js';

export async function notifyTaskRecipients(
  db: Db,
  task: TaskRow,
  actorId: string,
  notices: Map<string, TaskNotice>,
  now: Date,
  commentId?: string,
) {
  const recipients = [...notices.keys()].filter((id) => id !== actorId);
  if (recipients.length === 0) return;
  const members = await repo.currentRecipients(db, task.boardId, recipients);
  const context = await repo.eventContext(db, task.boardId, actorId);
  await repo.insert(
    db,
    recipients
      .filter((id) => members.has(id))
      .map((userId) => ({
        userId,
        type: notices.get(userId)!.type,
        boardId: task.boardId,
        boardName: context.boardName,
        message: `${context.actorName}: ${notices.get(userId)!.message} — ${task.key} «${task.title}»`,
        taskKey: task.key,
        commentId,
        createdAt: now,
      })),
  );
}

export const notifyTaskChange = (
  db: Db,
  before: TaskRow | undefined,
  after: TaskRow,
  actorId: string,
  now: Date,
) =>
  notifyTaskRecipients(
    db,
    after,
    actorId,
    taskChangeNotices(before, after),
    now,
  );

export const notifyTaskActivity = (
  db: Db,
  task: TaskRow,
  actorId: string,
  message: string,
  now: Date,
) =>
  notifyTaskRecipients(
    db,
    task,
    actorId,
    new Map(
      taskParticipants(task).map((id) => [
        id,
        { type: 'task_activity', message },
      ]),
    ),
    now,
  );

export async function notifyBoardMemberChange(
  db: Db,
  boardId: number,
  userId: string,
  actorId: string,
  type: Extract<
    NotificationType,
    'board_member_removed' | 'board_role_changed'
  >,
  now: Date,
  role?: BoardRole,
) {
  const context = await repo.eventContext(db, boardId, actorId);
  await repo.insert(db, [
    {
      userId,
      boardId,
      boardName: context.boardName,
      type,
      createdAt: now,
      message:
        type === 'board_member_removed'
          ? `${context.actorName}: вас удалили с доски «${context.boardName}»`
          : `${context.actorName}: ваша роль на доске «${context.boardName}» изменена на «${BOARD_ROLE_LABELS[role!]}»`,
    },
  ]);
}

export async function listNotifications(
  deps: AppDeps,
  userId: string,
  query: { page: number; pageSize: number },
): Promise<NotificationsResponse> {
  const result = await repo.list(deps.db, userId, query.page, query.pageSize);
  return {
    ...result,
    ...query,
    items: result.items.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt).toISOString(),
      readAt: item.readAt ? new Date(item.readAt).toISOString() : null,
    })),
  };
}

export const markNotificationRead = (
  deps: AppDeps,
  userId: string,
  id?: string,
) => repo.markRead(deps.db, userId, deps.now(), id);

export const deleteNotification = (deps: AppDeps, userId: string, id: string) =>
  repo.remove(deps.db, userId, id);
