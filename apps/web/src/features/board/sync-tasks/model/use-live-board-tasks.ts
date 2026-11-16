import { useEffect } from 'react';

import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import {
  boardTasksQueryOptions,
  putTaskCardInCache,
  subscribeBoardTaskEvents,
  taskQueryKeys,
} from '@/entities/task';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';
import { syncServerClock } from '@/shared/lib/time';

/** Подписка живёт только на экране доски; собственные переносы не затираются событиями. */
export function useLiveBoardTasks(boardId: number) {
  const client = useQueryClient();

  useEffect(() => {
    let active = true;
    let needsRefresh = false;
    let updates = Promise.resolve();
    const queryKey = taskQueryKeys.board(boardId);
    const moving = () =>
      client.isMutating({ mutationKey: taskQueryKeys.all }) > 0;
    const refresh = () => {
      if (!active || moving()) {
        needsRefresh = true;
        return;
      }
      needsRefresh = false;
      void client.invalidateQueries({ queryKey, exact: true });
    };
    const unsubscribeMutations = client.getMutationCache().subscribe(() => {
      if (needsRefresh && !moving()) refresh();
    });
    const unsubscribeEvents = subscribeBoardTaskEvents(
      boardId,
      (event) => {
        updates = updates.then(async () => {
          if (!active) return;
          if (event.type === 'ready') {
            refresh();
            return;
          }
          if (moving()) {
            needsRefresh = true;
            return;
          }
          await client.cancelQueries({ queryKey, exact: true });
          if (!active) return;
          if (moving()) {
            needsRefresh = true;
            return;
          }
          syncServerClock(event);
          for (const card of event.items) putTaskCardInCache(client, card);
          await invalidateTags(client, [QUERY_TAGS.tasks], { refetch: false });
        });
      },
      refresh,
    );
    return () => {
      active = false;
      unsubscribeEvents();
      unsubscribeMutations();
    };
  }, [boardId, client]);

  return useSuspenseQuery({
    ...boardTasksQueryOptions(boardId),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
