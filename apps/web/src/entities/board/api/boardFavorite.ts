import { apiClient } from '@/shared/api';

/** PUT `/boards/{boardId}/favorite` — идемпотентное добавление. */
export async function addBoardToFavorites(boardId: number): Promise<void> {
  return apiClient.put<void>(`/boards/${boardId}/favorite`);
}

/** DELETE `/boards/{boardId}/favorite` — идемпотентное удаление. */
export async function removeBoardFromFavorites(boardId: number): Promise<void> {
  return apiClient.delete<void>(`/boards/${boardId}/favorite`);
}
