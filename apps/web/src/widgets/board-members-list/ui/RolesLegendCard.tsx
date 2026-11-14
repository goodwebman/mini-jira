import { BOARD_ROLES } from '@gwmt/contracts';

import { BOARD_ROLE_META, BoardRoleBadge } from '@/entities/board';
import { UICard } from '@/shared/ui';

/** «Что могут роли»: легенда прав на доске. */
export function RolesLegendCard() {
  return (
    <UICard className='flex flex-col gap-2'>
      <UICard.Title>Что могут роли</UICard.Title>
      {BOARD_ROLES.map((role) => (
        <div
          key={role}
          className='flex flex-col items-start gap-1 border-t border-border pt-2'
        >
          <BoardRoleBadge role={role} />
          <span className='text-small text-muted-foreground'>
            {BOARD_ROLE_META[role].description}
          </span>
        </div>
      ))}
    </UICard>
  );
}
