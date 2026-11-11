import { boardDetailSchema, createBoardBodySchema } from '@gwmt/contracts';
import type { CreateBoardBody } from '../model';
import { apiClient } from '@/shared/api';

/** POST `/boards`. Создатель становится администратором. */
export async function createBoard(body: CreateBoardBody) {
  return apiClient.post<unknown>('/boards', createBoardBodySchema.parse(body)).then(boardDetailSchema.parse);
}
