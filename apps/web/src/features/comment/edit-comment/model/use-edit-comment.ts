import type { UpdateCommentBody } from '@gwmt/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateComment } from '@/entities/comment';
import { replaceTaskComment } from '@/entities/task';

export function useEditComment(taskKey: string, commentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCommentBody) =>
      updateComment(taskKey, commentId, body),
    meta: { toast: false },
    onSuccess: (comment) => replaceTaskComment(client, taskKey, comment),
  });
}
