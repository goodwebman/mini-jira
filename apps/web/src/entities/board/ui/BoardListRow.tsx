import type { ReactNode } from 'react';

import type { BoardListItem } from '@gwmt/contracts';

import { type RenderElement, Slot } from '@/shared/lib/dom';

import { boardMetaLine } from '../model/board-view';
import { BoardIconTile } from './BoardIconTile';

export interface IBoardListRowProps {
  readonly board: BoardListItem;
  /** Ссылка на доску (`<Link>` роутера). */
  readonly render: RenderElement;
  /** Аватары участников; на узких экранах прячутся. */
  readonly people?: ReactNode;
  /** Кнопка справа, обычно звёздочка. */
  readonly action?: ReactNode;
}

/** Строка в списке досок: плитка, название, подпись, участники и действие. */
export function BoardListRow({
  board,
  render,
  people,
  action,
}: IBoardListRowProps) {
  return (
    <div className='flex items-center gap-1 rounded-card transition-colors duration-150 hover:bg-background'>
      <Slot
        render={render}
        className='flex min-h-[calc(var(--avatar-lg)+20px)] min-w-0 flex-1 items-center gap-3 rounded-card px-2 py-1 text-foreground no-underline focus-ring'
      >
        <BoardIconTile colorIndex={board.colorIndex} />
        <span className='flex min-w-0 flex-1 flex-col'>
          <span className='line-clamp-2 font-medium wrap-anywhere'>
            {board.name}
          </span>
          <span className='text-caption wrap-anywhere text-muted-foreground tabular-nums'>
            {boardMetaLine(board)}
          </span>
        </span>
        {people != null && (
          <span className='hidden flex-none w960:flex'>{people}</span>
        )}
      </Slot>
      {action}
    </div>
  );
}
