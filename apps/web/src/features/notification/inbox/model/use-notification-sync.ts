import { useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationsQueryOptions } from '@/entities/notification';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';
import { useReducedMotion } from '@/shared/lib/hooks';

export function useNotificationSync() {
  const client = useQueryClient();
  const query = useQuery(notificationsQueryOptions());
  const count = query.data?.unreadCount ?? 0;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Query's visibility listener covers tab switching; focus covers another window.
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void invalidateTags(client, [QUERY_TAGS.notifications]);
      }
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [client]);

  useEffect(() => {
    if (count === 0) return;
    const original = document.title;
    const message = `У вас новое уведомление (${String(count)})`;
    document.title = message;
    const interval = reducedMotion
      ? undefined
      : window.setInterval(() => {
          document.title = document.title === message ? original : message;
        }, 1000);
    return () => {
      window.clearInterval(interval);
      document.title = original;
    };
  }, [count, reducedMotion]);
}
