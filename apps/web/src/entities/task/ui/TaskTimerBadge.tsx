import { UIBadge } from '@/shared/ui';

import type { TaskTimerView } from '../model/task-timer';
import { TIMER_ICON } from './timer-icon';

/** Длительность в текущей колонке. `compact` убирает иконку в таблице. */
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
      title={view.label}
      className={compact ? undefined : 'rounded-control px-2'}
    >
      {compact ? (
        view.short
      ) : (
        <>
          <span className='sr-only'>{view.label}</span>
          <span aria-hidden='true'>{view.short}</span>
        </>
      )}
    </UIBadge>
  );
}
