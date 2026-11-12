import {
  addMemberBodySchema,
  boardMemberSchema,
  updateMemberBodySchema,
} from '@gwmt/contracts';

import { apiClient } from '@/shared/api';

import type { AddMemberBody, UpdateMemberBody } from '../model';

/** POST `/boards/{boardId}/members`. */
export async function addBoardMember(boardId: number, body: AddMemberBody) {
  return apiClient
    .post<unknown>(
      `/boards/${boardId}/members`,
      addMemberBodySchema.parse(body),
    )
    .then(boardMemberSchema.parse);
}

/** PATCH `/boards/{boardId}/members/{userId}`. */
export async function updateBoardMember(
  boardId: number,
  userId: string,
  body: UpdateMemberBody,
) {
  return apiClient
    .patch<unknown>(
      `/boards/${boardId}/members/${encodeURIComponent(userId)}`,
      updateMemberBodySchema.parse(body),
    )
    .then(boardMemberSchema.parse);
}

/** DELETE `/boards/{boardId}/members/{userId}`. */
export async function removeBoardMember(
  boardId: number,
  userId: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/boards/${boardId}/members/${encodeURIComponent(userId)}`,
  );
}
