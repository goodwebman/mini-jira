import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type UpdateBoardBody,
  boardQueryKeys,
  updateBoard,
} from '@/entities/board';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

export function useUpdateBoard(boardId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBoardBody) => updateBoard(boardId, body),
    meta: { toast: false },
    onSuccess: async (board) => {
      const queryKey = boardQueryKeys.detail(board.id);
      await client.cancelQueries({ queryKey, exact: true });
      client.setQueryData(queryKey, board);
      void invalidateTags(client, [QUERY_TAGS.boards, QUERY_TAGS.tasks]);
    },
  });
}
