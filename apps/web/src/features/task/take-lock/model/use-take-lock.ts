import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  clearTaskTakeLock,
  putTaskCardInCache,
  setTaskTakeLock,
} from '@/entities/task';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

/**
 * Запрет брать в работу: доступен администратору, пока задача в «К работе».
 * Сервер отвечает карточкой — она и кладётся в кэш, остальное лишь помечается
 * устаревшим без перезапроса.
 */
export function useTakeLock(taskKey: string) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (locked: boolean) =>
      locked ? setTaskTakeLock(taskKey) : clearTaskTakeLock(taskKey),
    onSuccess: (card) => {
      putTaskCardInCache(client, card);
      return invalidateTags(client, [QUERY_TAGS.tasks], { refetch: false });
    },
  });
  return {
    setLocked: (locked: boolean) => mutation.mutate(locked),
    pendingLocked: mutation.isPending ? mutation.variables : null,
  };
}
