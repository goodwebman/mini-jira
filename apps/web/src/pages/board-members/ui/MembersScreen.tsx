import { useSuspenseQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';

import { useSessionUser } from '@/entities/auth';
import {
  BoardReadOnlyBanner,
  boardQueryOptions,
  getBoardPermissions,
  useRememberCurrentBoard,
} from '@/entities/board';
import { AddMembersPanel } from '@/features/board/manage-members';
import { ROUTES } from '@/shared/routes';
import { UICard } from '@/shared/ui';
import { ShellPage } from '@/widgets/app-shell';
import {
  MemberRow,
  MembersLayout,
  RolesLegendCard,
} from '@/widgets/board-members-list';

export function MembersScreen({ boardId }: { readonly boardId: number }) {
  const me = useSessionUser();
  const navigate = useNavigate();
  const { search } = useLocation();
  const { data: board } = useSuspenseQuery(boardQueryOptions(boardId));
  useRememberCurrentBoard(board.id);
  const { canManageMembers, isReadOnly } = getBoardPermissions(board.myRole);

  return (
    <ShellPage
      title='Участники доски'
      caption={board.name}
      onBack={() =>
        void navigate({ pathname: ROUTES.BOARD.build(board.id), search })
      }
      banner={isReadOnly && <BoardReadOnlyBanner />}
    >
      <MembersLayout
        members={
          <UICard className='flex flex-col'>
            <UICard.Title className='mb-2'>
              На доске · {board.members.length}
            </UICard.Title>
            {board.members.map((member) => (
              <MemberRow
                key={member.id}
                boardId={board.id}
                member={member}
                isMe={member.id === me.id}
                canManage={canManageMembers}
              />
            ))}
          </UICard>
        }
        aside={
          <>
            {canManageMembers && <AddMembersPanel boardId={board.id} />}
            <RolesLegendCard />
          </>
        }
      />
    </ShellPage>
  );
}
