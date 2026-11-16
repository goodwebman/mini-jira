import type { CreateCommentBody } from '@gwmt/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createComment } from '@/entities/comment';
import { appendTaskComment } from '@/entities/task';

/** Ответ сервера дописывается в деталь задачи: перезапрос не нужен. */
export function useAddTaskComment(taskKey: string, parentId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCommentBody) =>
      createComment(taskKey, { ...body, parentId }),
    // Ошибку форма показывает под полем
    meta: { toast: false },
    onSuccess: (comment) => appendTaskComment(client, taskKey, comment),
  });
}
