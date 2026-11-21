import { useEffect } from 'react';

import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import {
  boardTasksQueryOptions,
  putTaskCardInCache,
  subscribeBoardTaskEvents,
  taskQueryKeys,
} from '@/entities/task';
import { TASK_STATUS_MUTATION_KEY } from '@/features/task/change-status';
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
      client.isMutating({
        mutationKey: TASK_STATUS_MUTATION_KEY,
        exact: true,
      }) > 0;
    const refresh = () => {
      if (!active) return;
      if (moving()) {
        needsRefresh = true;
        return;
      }
      needsRefresh = false;
      return client.invalidateQueries({ queryKey, exact: true });
    };
    const queueRefresh = () => {
      updates = updates.then(refresh);
    };
    const unsubscribeMutations = client.getMutationCache().subscribe(() => {
      if (!needsRefresh || moving()) return;
      needsRefresh = false;
      queueRefresh();
    });
    const unsubscribeEvents = subscribeBoardTaskEvents(
      boardId,
      (event) => {
        updates = updates.then(async () => {
          if (!active) return;
          if (event.type === 'ready') {
            // Снимок устанавливает базу: следующие события содержат лишь изменённые карточки.
            await refresh();
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
      queueRefresh,
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
