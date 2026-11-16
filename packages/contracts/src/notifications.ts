import { z } from 'zod';

import { isoDateTimeSchema } from './dto.js';

export const NOTIFICATION_TYPES = [
  'board_member_added',
  'board_role_changed',
  'board_member_removed',
  'task_assigned',
  'task_unassigned',
  'task_updated',
  'task_status_changed',
  'task_review_rejected',
  'task_test_failed',
  'task_activity',
  'comment_added',
  'comment_reply',
  'comment_mention',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notificationSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(NOTIFICATION_TYPES),
    boardId: z.number().int().positive(),
    boardName: z.string(),
    message: z.string().nullable().optional(),
    taskKey: z.string().nullable().optional(),
    commentId: z.uuid().nullable().optional(),
    createdAt: isoDateTimeSchema,
    readAt: isoDateTimeSchema.nullable(),
  })
  .meta({ id: 'Notification' });
export type Notification = z.infer<typeof notificationSchema>;

export const notificationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .meta({ id: 'NotificationsQuery' });

export const notificationIdParamSchema = z.object({ id: z.uuid() });

export const notificationsResponseSchema = z
  .object({
    items: z.array(notificationSchema),
    total: z.number().int().nonnegative(),
    unreadCount: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  })
  .meta({ id: 'NotificationsResponse' });
export type NotificationsResponse = z.infer<typeof notificationsResponseSchema>;
