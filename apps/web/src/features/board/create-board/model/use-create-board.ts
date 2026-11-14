import { useMutation, useQueryClient } from '@tanstack/react-query';

import { boardQueryKeys, createBoard } from '@/entities/board';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';

/**
 * Ответ — готовая деталь доски: кладём её в кэш, и страница новой доски
 * открывается без загрузки. Списки досок обновятся в фоне.
 */
export function useCreateBoard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createBoard,
    meta: { toast: false },
    onSuccess: (board) => {
      client.setQueryData(boardQueryKeys.detail(board.id), board);
      void invalidateTags(client, [QUERY_TAGS.boards]);
    },
  });
}
