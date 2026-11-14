import type { BoardRole } from '@gwmt/contracts';

import { UIBadge } from '@/shared/ui';

import { BOARD_ROLE_META } from '../model/board-role';

export function BoardRoleBadge({ role }: { readonly role: BoardRole }) {
  const meta = BOARD_ROLE_META[role];
  return <UIBadge tone={meta.tone}>{meta.label}</UIBadge>;
}
