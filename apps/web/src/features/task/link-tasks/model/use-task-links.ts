import type { CreateLinkBody } from '@gwmt/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createTaskLink, deleteTaskLink } from '@/entities/task';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

/**
 * Связь двусторонняя: сервер создаёт и удаляет обратную сторону сам.
 * Поэтому после мутации устаревают обе задачи и обе доски — домен `tasks`.
 */
export function useLinkTask(taskKey: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLinkBody) => createTaskLink(taskKey, body),
    meta: { toast: false },
    onSuccess: () => invalidateTags(client, [QUERY_TAGS.tasks]),
  });
}

export function useUnlinkTask(taskKey: string) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (targetKey: string) => deleteTaskLink(taskKey, targetKey),
    onSuccess: () => invalidateTags(client, [QUERY_TAGS.tasks]),
  });
  return {
    unlink: (targetKey: string) => mutation.mutate(targetKey),
    pendingKey: mutation.isPending ? mutation.variables : null,
  };
}
