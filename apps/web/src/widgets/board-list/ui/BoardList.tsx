import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import {
  type BoardListFilter,
  BoardListFilterSelect,
  BoardListRow,
  BoardSearchInput,
  boardsQueryOptions,
} from '@/entities/board';
import { UserAvatarStack } from '@/entities/user';
import { BoardFavoriteToggle } from '@/features/board/toggle-favorite';
import { cn } from '@/shared/lib/cn';
import { useDebouncedValue } from '@/shared/lib/hooks';
import { ROUTES } from '@/shared/routes';
import { UIEmptyState, UIRequestError, UISkeleton } from '@/shared/ui';

export interface IBoardListProps {
  /** `page` — список в рамке на странице «Доски», `panel` — в выезжающей панели. */
  readonly variant: 'page' | 'panel';
  /** Вызывается при переходе на доску: панель закрывается. */
  readonly onNavigate?: () => void;
}

/**
 * Список досок с поиском, фильтром «Избранные» и звёздочкой.
 * Поиск и фильтр — состояние этого экземпляра (module scope): у страницы
 * и у панели они свои. Фильтрует сервер, поэтому ввод дебаунсится.
 */
export function BoardList({ variant, onNavigate }: IBoardListProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BoardListFilter>('all');
  const q = useDebouncedValue(query.trim());
  const boards = useQuery({
    ...boardsQueryOptions({ q: q || undefined, filter }),
    placeholderData: (previous) => previous,
  });
  const items = boards.data?.items ?? [];

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap gap-2'>
        <BoardSearchInput value={query} onValueChange={setQuery} />
        <BoardListFilterSelect value={filter} onValueChange={setFilter} />
      </div>
      <div
        className={cn(
          'flex flex-col gap-0.5',
          variant === 'page' &&
            'rounded-block border border-border bg-surface p-2',
        )}
        aria-busy={boards.isFetching}
      >
        {boards.isPending &&
          ['a', 'b', 'c', 'd'].map((key) => (
            <UISkeleton
              key={key}
              className='h-[calc(var(--avatar-lg)+20px)] rounded-card'
            />
          ))}
        {boards.isError && (
          <UIRequestError
            error={boards.error}
            retry={() => void boards.refetch()}
          />
        )}
        {boards.isSuccess && items.length === 0 && (
          <UIEmptyState
            title={
              q || filter === 'favorite' ? 'Доски не найдены' : 'Досок пока нет'
            }
          />
        )}
        {items.map((board) => (
          <BoardListRow
            key={board.id}
            board={board}
            render={
              <Link to={ROUTES.BOARD.build(board.id)} onClick={onNavigate} />
            }
            people={
              <UserAvatarStack
                size='sm'
                people={board.membersPreview.map((user) => ({ user }))}
              />
            }
            action={<BoardFavoriteToggle board={board} />}
          />
        ))}
      </div>
    </div>
  );
}
