import { UIBadge } from '@/shared/ui';

import type { TaskTimerView } from '../model/task-timer';
import { TIMER_ICON } from './timer-icon';

/** Сколько задача в статусе или на паузе. `compact` — короткая подпись для таблиц. */
export function TaskTimerBadge({
  view,
  compact = false,
}: {
  readonly view: TaskTimerView;
  readonly compact?: boolean;
}) {
  const Icon = TIMER_ICON[view.icon];
  return (
    <UIBadge
      tone={view.tone}
      icon={compact ? undefined : <Icon className='size-icon-sm' />}
      className='min-w-0'
    >
      <span className='truncate'>{compact ? view.short : view.label}</span>
    </UIBadge>
  );
}
