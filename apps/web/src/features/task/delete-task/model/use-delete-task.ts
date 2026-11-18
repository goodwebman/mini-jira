import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteTask, removeTaskFromCache } from '@/entities/task';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

export function useDeleteTask(boardId: number, taskKey: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => deleteTask(taskKey),
    meta: { toast: false },
    onSuccess: async () => {
      await removeTaskFromCache(client, boardId, taskKey);
      await invalidateTags(client, [
        QUERY_TAGS.tasks,
        QUERY_TAGS.notifications,
      ]);
    },
  });
}
