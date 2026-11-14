import type { CreateTaskBody } from '@gwmt/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createTask, putTaskCardInCache } from '@/entities/task';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

export function useCreateTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      boardId,
      body,
    }: {
      boardId: number;
      body: CreateTaskBody;
    }) => createTask(boardId, body),
    // Ошибки валидации форма показывает под полями
    meta: { toast: false },
    onSuccess: (card) => {
      putTaskCardInCache(client, card);
      return invalidateTags(client, [QUERY_TAGS.tasks]);
    },
  });
}
