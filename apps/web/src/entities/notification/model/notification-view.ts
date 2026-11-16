import type { Notification } from '@gwmt/contracts';

import { ROUTES } from '@/shared/routes';

export const notificationText = (notification: Notification) =>
  notification.message ?? `Вас добавили на доску «${notification.boardName}»`;

export function notificationTarget(notification: Notification) {
  if (notification.type === 'board_member_removed') return null;
  if (notification.taskKey)
    return notification.commentId
      ? ROUTES.TASK_COMMENT.build(notification.taskKey, notification.commentId)
      : ROUTES.TASK.build(notification.taskKey);
  return ROUTES.BOARD.build(notification.boardId);
}
