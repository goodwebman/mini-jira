import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/entities/notification';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

export function useNotificationActions() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (
      action: { type: 'delete' | 'read'; id: string } | { type: 'readAll' },
    ) => {
      if (action.type === 'readAll') return markAllNotificationsRead();
      return action.type === 'read'
        ? markNotificationRead(action.id)
        : deleteNotification(action.id);
    },
    onSuccess: () => invalidateTags(client, [QUERY_TAGS.notifications]),
  });
}
