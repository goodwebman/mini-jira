import { useMutation, useQueryClient } from '@tanstack/react-query';

import { pauseTask, putTaskCardInCache, resumeTask, taskQueryKeys } from '@/entities/task';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

/**
 * Пауза и продолжение. Сервер отвечает карточкой с пересчитанным таймером:
 * её и кладём в кэш. Остальные экраны с таймером только помечаются устаревшими,
 * лишних запросов нет.
 */
export function useToggleTaskPause() {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ key, paused }: { key: string; paused: boolean }) =>
      paused ? resumeTask(key) : pauseTask(key),
    onSuccess: async (card) => {
      putTaskCardInCache(client, card);
      await invalidateTags(client, [QUERY_TAGS.tasks], { refetch: false });
      await client.invalidateQueries({ queryKey: taskQueryKeys.detail(card.key), exact: true });
    },
  });
  return {
    toggle: (key: string, paused: boolean) => mutation.mutate({ key, paused }),
    pendingKey: mutation.isPending ? mutation.variables.key : null,
  };
}
