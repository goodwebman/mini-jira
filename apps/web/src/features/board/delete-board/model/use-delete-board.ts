import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type BoardDetail,
  boardQueryKeys,
  deleteBoard,
  removeBoardFromLists,
  useCurrentBoardStore,
} from '@/entities/board';
import { removeBoardSprintsFromCache } from '@/entities/sprint';
import { removeBoardTasksFromCache } from '@/entities/task';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

export function useDeleteBoard(
  board: Pick<BoardDetail, 'id' | 'key'>,
  onDeleted: () => Promise<void> | void,
) {
  const client = useQueryClient();
  const currentBoard = useCurrentBoardStore();

  return useMutation({
    mutationFn: () => deleteBoard(board.id),
    meta: { toast: false },
    onSuccess: async () => {
      await removeBoardFromLists(client, board.id);
      await onDeleted();
      if (currentBoard.getSnapshot() === board.id) currentBoard.forget();
      client.removeQueries({ queryKey: boardQueryKeys.detail(board.id) });
      removeBoardTasksFromCache(client, board.id, board.key);
      removeBoardSprintsFromCache(client, board.id);
      void invalidateTags(client, [
        QUERY_TAGS.boards,
        QUERY_TAGS.tasks,
        QUERY_TAGS.notifications,
      ]);
    },
  });
}
