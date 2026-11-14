import type { BoardListItem, BoardMember } from '@gwmt/contracts';

import { countLabel } from '@/shared/lib/format';
import { type UIAvatarTint, getTintByIndex } from '@/shared/ui';

import { BOARD_ROLE_META } from './board-role';

export const MEMBER_FORMS = ['участник', 'участника', 'участников'] as const;
export const BOARD_FORMS = ['доска', 'доски', 'досок'] as const;

export function boardTint(colorIndex: number): UIAvatarTint {
  return getTintByIndex(colorIndex);
}

/** «ID:9 · GWT · 6 участников · Администратор» — подпись строки списка досок. */
export function boardMetaLine(
  board: Pick<BoardListItem, 'id' | 'key' | 'memberCount' | 'myRole'>,
): string {
  return [
    `ID:${String(board.id)}`,
    board.key,
    countLabel(board.memberCount, MEMBER_FORMS),
    BOARD_ROLE_META[board.myRole].label,
  ].join(' · ');
}

/** Кого можно назначить на задачу: гости в чипы и селекты не попадают. */
export function assignableMembers<T extends Pick<BoardMember, 'role'>>(
  members: readonly T[],
): T[] {
  return members.filter((member) => member.role !== 'guest');
}
