import { UIAlert } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

import { LOCK_HINT } from './lock-hint';

/** Предупреждение «Запрет» на странице задачи для тех, кто не может его снять. */
export function TaskLockNotice() {
  return (
    <UIAlert tone='warning' icon={<UIIcons.Lock />}>
      {LOCK_HINT}
    </UIAlert>
  );
}
