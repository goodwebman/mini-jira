import { z } from 'zod';

import { isoDateTimeSchema } from './dto.js';

export const notificationSchema = z
  .object({
    id: z.uuid(),
    type: z.literal('board_member_added'),
    boardId: z.number().int().positive(),
    boardName: z.string(),
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
