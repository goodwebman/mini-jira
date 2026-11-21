import { boardDetailSchema, updateBoardBodySchema } from '@gwmt/contracts';

import { apiClient } from '@/shared/api';

import type { UpdateBoardBody } from '../model/types';

export async function updateBoard(boardId: number, body: UpdateBoardBody) {
  return apiClient
    .patch<unknown>(`/boards/${boardId}`, updateBoardBodySchema.parse(body))
    .then(boardDetailSchema.parse);
}

export async function deleteBoard(boardId: number): Promise<void> {
  await apiClient.delete(`/boards/${boardId}`);
}
