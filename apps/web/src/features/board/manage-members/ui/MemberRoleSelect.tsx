import type { BoardMember } from '@gwmt/contracts';

import { BoardRoleSelect } from '@/entities/board';

import { useChangeMemberRole } from '../model/use-board-members';

export function MemberRoleSelect({
  boardId,
  member,
}: {
  readonly boardId: number;
  readonly member: BoardMember;
}) {
  const { changeRole, pending } = useChangeMemberRole(boardId);
  const isPending = pending?.member.id === member.id;
  return (
    <BoardRoleSelect
      aria-label={`Роль: ${member.name}`}
      value={isPending ? pending.role : member.role}
      disabled={isPending}
      wrapperClassName='w-44 min-w-0'
      onValueChange={(role) => {
        if (role !== member.role) changeRole(member, role);
      }}
    />
  );
}
