import { createCommentBodySchema, taskCommentSchema } from '@gwmt/contracts';

import { apiClient } from '@/shared/api';

import type { CreateCommentBody } from '../model';

/**
 * POST `/tasks/{key}/comments`. Комментарий — отдельная сущность: у него свой
 * автор, время и права (`task.comment`), а задача лишь его владелец.
 */
export async function createComment(taskKey: string, body: CreateCommentBody) {
  return apiClient
    .post<unknown>(
      `/tasks/${encodeURIComponent(taskKey)}/comments`,
      createCommentBodySchema.parse(body),
    )
    .then(taskCommentSchema.parse);
}
