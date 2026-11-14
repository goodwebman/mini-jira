import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createComment } from '@/entities/comment';
import { appendTaskComment } from '@/entities/task';

/** Ответ сервера дописывается в деталь задачи: перезапрос не нужен. */
export function useAddTaskComment(taskKey: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => createComment(taskKey, { text }),
    // Ошибку форма показывает под полем
    meta: { toast: false },
    onSuccess: (comment) => appendTaskComment(client, taskKey, comment),
  });
}
