import type { BoardMember } from '@gwmt/contracts';

import { UIButton } from '@/shared/ui';

import { useRemoveBoardMember } from '../model/use-board-members';

export function RemoveMemberButton({
  boardId,
  member,
}: {
  readonly boardId: number;
  readonly member: BoardMember;
}) {
  const { remove, pendingUserId } = useRemoveBoardMember(boardId);
  return (
    <UIButton
      variant='danger-ghost'
      aria-label={`Убрать: ${member.name}`}
      loading={pendingUserId === member.id}
      onClick={() => remove(member)}
    >
      Убрать
    </UIButton>
  );
}
