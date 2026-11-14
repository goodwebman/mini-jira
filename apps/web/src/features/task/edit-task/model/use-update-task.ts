import type { UpdateTaskBody } from '@gwmt/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { putTaskCardInCache, updateTask } from '@/entities/task';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

/**
 * Свойства задачи меняются по одному полю сразу после выбора, как в макете.
 * Пока запрос в полёте, поле показывает отправленное значение (`pending`),
 * при ошибке возвращается серверное — без ручного отката.
 */
export function useUpdateTask(taskKey: string) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: UpdateTaskBody) => updateTask(taskKey, body),
    onSuccess: (card) => putTaskCardInCache(client, card),
    onSettled: () => invalidateTags(client, [QUERY_TAGS.tasks]),
  });
  return {
    update: (body: UpdateTaskBody) => mutation.mutate(body),
    pending: mutation.isPending ? mutation.variables : null,
  };
}
