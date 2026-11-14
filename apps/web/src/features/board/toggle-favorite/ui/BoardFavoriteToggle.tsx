import type { BoardListItem } from '@gwmt/contracts';

import { BoardFavoriteButton } from '@/entities/board';

import { useToggleBoardFavorite } from '../model/use-toggle-board-favorite';

export function BoardFavoriteToggle({
  board,
}: {
  readonly board: Pick<BoardListItem, 'id' | 'isFavorite' | 'name'>;
}) {
  const { toggle, pendingBoardId } = useToggleBoardFavorite();
  return (
    <BoardFavoriteButton
      boardName={board.name}
      isFavorite={board.isFavorite}
      disabled={pendingBoardId === board.id}
      onToggle={() => toggle(board.id, !board.isFavorite)}
    />
  );
}
