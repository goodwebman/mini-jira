import type { BoardMember } from '@gwmt/contracts';

import { BoardRoleBadge } from '@/entities/board';
import { UserAvatar } from '@/entities/user';
import {
  MemberRoleSelect,
  RemoveMemberButton,
} from '@/features/board/manage-members';
import { UIBadge, UIListItem } from '@/shared/ui';

/**
 * Строка участника. Администратор меняет роль и убирает других; себя — нет,
 * чтобы доска не осталась без администратора.
 */
export function MemberRow({
  boardId,
  member,
  isMe,
  canManage,
}: {
  readonly boardId: number;
  readonly member: BoardMember;
  readonly isMe: boolean;
  readonly canManage: boolean;
}) {
  return (
    <UIListItem
      divided
      media={<UserAvatar user={member} size='lg' />}
      title={member.name}
      description={[member.job, member.email].filter(Boolean).join(' · ')}
      actions={
        canManage && !isMe ? (
          <>
            <MemberRoleSelect boardId={boardId} member={member} />
            <RemoveMemberButton boardId={boardId} member={member} />
          </>
        ) : (
          <>
            <BoardRoleBadge role={member.role} />
            {isMe && <UIBadge tone='neutral'>Это вы</UIBadge>}
          </>
        )
      }
    />
  );
}
