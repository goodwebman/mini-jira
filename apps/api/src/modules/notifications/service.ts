import type { NotificationsResponse } from '@gwmt/contracts';

import type { AppDeps } from '../../lib/context.js';
import * as repo from './repo.js';

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
