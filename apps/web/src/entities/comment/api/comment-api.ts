import {
  type UpdateCommentBody,
  createCommentBodySchema,
  taskCommentSchema,
  updateCommentBodySchema,
} from '@gwmt/contracts';

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

const commentPath = (taskKey: string, commentId: string) =>
  `/tasks/${encodeURIComponent(taskKey)}/comments/${encodeURIComponent(commentId)}`;

export async function updateComment(
  taskKey: string,
  commentId: string,
  body: UpdateCommentBody,
) {
  return apiClient
    .patch<unknown>(
      commentPath(taskKey, commentId),
      updateCommentBodySchema.parse(body),
    )
    .then(taskCommentSchema.parse);
}

export function deleteComment(
  taskKey: string,
  commentId: string,
): Promise<void> {
  return apiClient.delete<void>(commentPath(taskKey, commentId));
}
