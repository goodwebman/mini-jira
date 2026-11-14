import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import type { TaskTimerTone, TaskTimerView } from '../model/task-timer';
import { TIMER_ICON } from './timer-icon';

const TONE_CLASS: Record<TaskTimerTone, string> = {
  accent: 'bg-status-work-tint text-status-work-emphasis',
  neutral: 'bg-status-todo-tint text-status-todo-emphasis',
  review: 'bg-status-review-tint text-status-review-emphasis',
  success: 'bg-status-done-tint text-status-done-emphasis',
  test: 'bg-status-test-tint text-status-test-emphasis',
  warning: 'bg-warning-tint text-warning-emphasis',
};

/** Крупный таймер в панели задачи: сколько в статусе и кнопка паузы. */
export function TaskTimerPanel({
  timer,
  action,
}: {
  readonly timer: TaskTimerView;
  readonly action?: ReactNode;
}) {
  const Icon = TIMER_ICON[timer.icon];
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-card px-4 py-3',
        TONE_CLASS[timer.tone],
      )}
    >
      <div className='flex items-center gap-2'>
        <Icon className='size-icon-lg shrink-0' aria-hidden='true' />
        <span className='text-lead font-semibold'>{timer.label}</span>
      </div>
      {action}
    </div>
  );
}
