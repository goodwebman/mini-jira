import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteComment } from '@/entities/comment';
import { removeTaskComment } from '@/entities/task';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

export function useDeleteComment(taskKey: string, commentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => deleteComment(taskKey, commentId),
    meta: { toast: false },
    onSuccess: async () => {
      await removeTaskComment(client, taskKey, commentId);
      await invalidateTags(client, [QUERY_TAGS.notifications]);
    },
  });
}
