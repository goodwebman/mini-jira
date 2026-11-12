import { boardDetailSchema, createBoardBodySchema } from '@gwmt/contracts';

import { apiClient } from '@/shared/api';

import type { CreateBoardBody } from '../model';

/** POST `/boards`. Создатель становится администратором. */
export async function createBoard(body: CreateBoardBody) {
  return apiClient
    .post<unknown>('/boards', createBoardBodySchema.parse(body))
    .then(boardDetailSchema.parse);
}
