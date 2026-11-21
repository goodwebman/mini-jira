import type { TaskStatus } from '@gwmt/contracts';

import { cn } from '@/shared/lib/cn';

import { TASK_STATUS_LABELS } from '../model/task-meta';
import { STATUS_TINT_CLASS, TASK_STATUS_DOT_CLASS } from './task-status.styles';

/** Статус задачи с цветной точкой. */
export function TaskStatusBadge({ status }: { readonly status: TaskStatus }) {
  return (
    <span
      data-name='UIStatusBadge'
      data-status={status}
      className={cn(
        'inline-flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full px-3 py-1',
        'text-small font-medium text-foreground',
        STATUS_TINT_CLASS[status],
      )}
    >
      <span
        aria-hidden='true'
        className={cn('size-[8px] rounded-full', TASK_STATUS_DOT_CLASS[status])}
      />
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
