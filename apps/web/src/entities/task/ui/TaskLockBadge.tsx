import { UIBadge, UITooltip } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

import { LOCK_HINT } from './lock-hint';

export function TaskLockBadge() {
  return (
    <UITooltip content={LOCK_HINT}>
      <UIBadge
        tone='warning'
        icon={<UIIcons.Lock className='size-icon-sm' />}
        aria-label={LOCK_HINT}
        tabIndex={0}
      >
        Запрет
      </UIBadge>
    </UITooltip>
  );
}
