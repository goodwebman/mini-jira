import type { TaskDetail, UpdateTaskBody } from '@gwmt/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { putTaskCardInCache, taskQueryKeys, updateTask } from '@/entities/task';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

/**
 * Свойства задачи меняются по одному полю сразу после выбора, как в макете.
 * Пока запрос в полёте, поле показывает отправленное значение (`pending`),
 * при ошибке возвращается серверное — без ручного отката.
 */
export function useUpdateTask(taskKey: string, { toast = true } = {}) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: UpdateTaskBody) => updateTask(taskKey, body),
    meta: { toast },
    onSuccess: async (card, body) => {
      await client.cancelQueries({
        queryKey: taskQueryKeys.detail(taskKey),
        exact: true,
      });
      putTaskCardInCache(client, card);
      const description = body.description;
      if (description !== undefined) {
        client.setQueryData<TaskDetail>(
          taskQueryKeys.detail(taskKey),
          (detail) => detail && { ...detail, description },
        );
      }
    },
    onSettled: () => invalidateTags(client, [QUERY_TAGS.tasks]),
  });
  return {
    ...mutation,
    update: (body: UpdateTaskBody) => mutation.mutate(body),
    pending: mutation.isPending ? mutation.variables : null,
  };
}
