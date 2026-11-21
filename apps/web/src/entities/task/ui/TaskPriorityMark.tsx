import type { TaskPriority } from '@gwmt/contracts';

import { cn } from '@/shared/lib/cn';
import { type UIIconComponent, UIIcons } from '@/shared/ui/icons';

import { TASK_PRIORITY_LABELS } from '../model/task-meta';

const PRIORITY_ICON: Record<TaskPriority, UIIconComponent> = {
  crit: UIIcons.AlertTriangle,
  high: UIIcons.ArrowUp,
  med: UIIcons.Equal,
  low: UIIcons.ArrowDown,
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  crit: 'text-destructive',
  high: 'text-warning',
  med: 'text-muted-foreground',
  low: 'text-primary-hover',
};

/** Иконка приоритета с доступным именем или видимой подписью. */
export function TaskPriorityMark({
  priority,
  withLabel = false,
  labelClassName,
}: {
  readonly priority: TaskPriority;
  readonly withLabel?: boolean;
  readonly labelClassName?: string;
}) {
  const Icon = PRIORITY_ICON[priority];
  const label = TASK_PRIORITY_LABELS[priority];

  return (
    <span
      data-name='UIPriority'
      data-priority={priority}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-small font-medium',
        PRIORITY_COLOR[priority],
      )}
    >
      <Icon className='size-icon-sm' title={withLabel ? undefined : label} />
      {withLabel && <span className={labelClassName}>{label}</span>}
    </span>
  );
}
