import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  addBoardToFavorites,
  removeBoardFromFavorites,
  setBoardFavoriteInCache,
  writeBoardFavorite,
} from '@/entities/board';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

const MUTATION_KEY = ['board', 'favorite'] as const;

/**
 * Звёздочка меняется сразу во всех списках. При ошибке откатывается только
 * флаг этой доски, перезапрос — после последнего клика серии.
 */
export function useToggleBoardFavorite() {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: ({
      boardId,
      isFavorite,
    }: {
      boardId: number;
      isFavorite: boolean;
    }) =>
      isFavorite
        ? addBoardToFavorites(boardId)
        : removeBoardFromFavorites(boardId),
    onMutate: ({ boardId, isFavorite }) =>
      setBoardFavoriteInCache(client, boardId, isFavorite),
    onError: (_error, { boardId, isFavorite }) =>
      writeBoardFavorite(client, boardId, !isFavorite),
    onSettled: () =>
      client.isMutating({ mutationKey: MUTATION_KEY }) === 1
        ? invalidateTags(client, [QUERY_TAGS.boards])
        : undefined,
  });
  return {
    toggle: (boardId: number, isFavorite: boolean) =>
      mutation.mutate({ boardId, isFavorite }),
    pendingBoardId: mutation.isPending ? mutation.variables.boardId : null,
  };
}
