import type { BoardDetail, BoardListResponse } from '@gwmt/contracts';
import type { QueryClient } from '@tanstack/react-query';

import { boardQueryKeys } from './boardQueries';

/**
 * Флаг избранного во всех списках досок (с любыми фильтрами) и в детали.
 * Из списка «Избранные» доска сразу не пропадает — исчезнет после перезапроса,
 * чтобы строка не прыгала под курсором.
 */
export function writeBoardFavorite(
  client: QueryClient,
  boardId: number,
  isFavorite: boolean,
): void {
  client.setQueriesData<BoardListResponse>(
    { queryKey: boardQueryKeys.lists },
    (data) =>
      data && {
        ...data,
        items: data.items.map((item) =>
          item.id === boardId ? { ...item, isFavorite } : item,
        ),
      },
  );
  client.setQueryData<BoardDetail>(
    boardQueryKeys.detail(boardId),
    (detail) => detail && { ...detail, isFavorite },
  );
}

/**
 * Оптимистичная звёздочка. Отменяются только запросы списков: деталь открытой
 * доски может грузиться под suspense, её не трогаем — устаревший флаг поправит
 * перезапрос после мутации.
 */
export async function setBoardFavoriteInCache(
  client: QueryClient,
  boardId: number,
  isFavorite: boolean,
): Promise<void> {
  await client.cancelQueries({ queryKey: boardQueryKeys.lists });
  writeBoardFavorite(client, boardId, isFavorite);
}

export async function removeBoardFromLists(
  client: QueryClient,
  boardId: number,
): Promise<void> {
  const lists = { queryKey: boardQueryKeys.lists };
  await client.cancelQueries(lists);
  client.setQueriesData<BoardListResponse>(lists, (data) => {
    if (!data?.items.some((item) => item.id === boardId)) return data;
    return {
      items: data.items.filter((item) => item.id !== boardId),
      total: data.total - 1,
    };
  });
}
