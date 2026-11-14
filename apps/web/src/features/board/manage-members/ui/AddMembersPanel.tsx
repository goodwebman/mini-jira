import { useState } from 'react';

import type { BoardRole } from '@gwmt/contracts';
import { useQuery } from '@tanstack/react-query';

import { BoardRoleSelect } from '@/entities/board';
import { UserAvatar, userSearchQueryOptions } from '@/entities/user';
import { useDebouncedValue } from '@/shared/lib/hooks';
import {
  UIButton,
  UICard,
  UIField,
  UIListItem,
  UISearchInput,
  UISkeleton,
} from '@/shared/ui';

import { useAddBoardMember } from '../model/use-board-members';

/** «Добавить людей»: поиск по имени или email среди тех, кого ещё нет на доске. */
export function AddMembersPanel({ boardId }: { readonly boardId: number }) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<BoardRole>('worker');
  const debounced = useDebouncedValue(query.trim());
  const search = useQuery({
    ...userSearchQueryOptions({ q: debounced, excludeBoardId: boardId }),
    placeholderData: (previous) => previous,
  });
  const { add, pendingUserId } = useAddBoardMember(boardId);
  const candidates = search.data?.items ?? [];
  const tooShort = debounced.length === 1;

  let emptyText = '';
  if (tooShort) emptyText = 'Введите хотя бы два символа';
  else if (search.isSuccess && candidates.length === 0)
    emptyText = debounced ? 'Никого не нашли' : 'Все уже на доске';

  return (
    <UICard className='flex flex-col gap-3'>
      <UICard.Title>Добавить людей</UICard.Title>
      <UISearchInput
        aria-label='Поиск по имени или email'
        placeholder='Поиск по имени или email'
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onClear={() => setQuery('')}
      />
      <UIField label='Добавлять с ролью'>
        <BoardRoleSelect value={role} onValueChange={setRole} />
      </UIField>
      <div className='flex flex-col'>
        {search.isPending && !tooShort && <UISkeleton className='h-14' />}
        {emptyText && (
          <div className='py-4 text-muted-foreground'>{emptyText}</div>
        )}
        {!tooShort &&
          candidates.map((user) => (
            <UIListItem
              key={user.id}
              divided
              media={<UserAvatar user={user} size='lg' />}
              title={user.name}
              description={user.job}
              actions={
                <UIButton
                  variant='secondary'
                  aria-label={`Добавить: ${user.name}`}
                  loading={pendingUserId === user.id}
                  onClick={() => add(user, role)}
                >
                  Добавить
                </UIButton>
              }
            />
          ))}
      </div>
    </UICard>
  );
}
