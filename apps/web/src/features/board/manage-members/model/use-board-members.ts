import type { BoardMember, BoardRole } from '@gwmt/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  BOARD_ROLE_META,
  addBoardMember,
  removeBoardMember,
  updateBoardMember,
} from '@/entities/board';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';
import { useToast } from '@/shared/ui';

type MemberRef = Pick<BoardMember, 'id' | 'name'>;

/** Участники меняют доску, списки досок (счётчик) и назначения задач. */
const MEMBER_TAGS = [QUERY_TAGS.members, QUERY_TAGS.boards] as const;

export function useAddBoardMember(boardId: number) {
  const client = useQueryClient();
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: ({ user, role }: { user: MemberRef; role: BoardRole }) =>
      addBoardMember(boardId, { userId: user.id, role }),
    onSuccess: (_member, { user }) => {
      toast(`${user.name} теперь на доске`);
      return invalidateTags(client, MEMBER_TAGS);
    },
  });
  return {
    add: (user: MemberRef, role: BoardRole) => mutation.mutate({ user, role }),
    pendingUserId: mutation.isPending ? mutation.variables.user.id : null,
  };
}

export function useChangeMemberRole(boardId: number) {
  const client = useQueryClient();
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: ({ member, role }: { member: MemberRef; role: BoardRole }) =>
      updateBoardMember(boardId, member.id, { role }),
    onSuccess: (_member, { member, role }) => {
      toast(`${member.name}: роль «${BOARD_ROLE_META[role].label}»`);
      // Гость пропадает из исполнителей: задачи тоже устаревают
      return invalidateTags(client, [...MEMBER_TAGS, QUERY_TAGS.tasks]);
    },
  });
  return {
    changeRole: (member: MemberRef, role: BoardRole) =>
      mutation.mutate({ member, role }),
    pending: mutation.isPending ? mutation.variables : null,
  };
}

export function useRemoveBoardMember(boardId: number) {
  const client = useQueryClient();
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: (member: MemberRef) => removeBoardMember(boardId, member.id),
    onSuccess: () => {
      toast('Участник убран с доски');
      return invalidateTags(client, [...MEMBER_TAGS, QUERY_TAGS.tasks]);
    },
  });
  return {
    remove: (member: MemberRef) => mutation.mutate(member),
    pendingUserId: mutation.isPending ? mutation.variables.id : null,
  };
}
