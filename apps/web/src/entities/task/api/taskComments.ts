import { createCommentBodySchema, taskCommentSchema } from '@gwmt/contracts';

import { apiClient } from '@/shared/api';

import type { CreateCommentBody } from '../model';

/** POST `/tasks/{key}/comments`. */
export async function createTaskComment(key: string, body: CreateCommentBody) {
  return apiClient
    .post<unknown>(
      `/tasks/${encodeURIComponent(key)}/comments`,
      createCommentBodySchema.parse(body),
    )
    .then(taskCommentSchema.parse);
}
