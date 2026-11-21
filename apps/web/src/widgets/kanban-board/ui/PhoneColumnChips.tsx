import type { TaskCard, TaskStatus } from '@gwmt/contracts';

import {
  TASK_STATUSES,
  TASK_STATUS_DOT_CLASS,
  TASK_STATUS_LABELS,
  groupTasksByStatus,
} from '@/entities/task';
import { cn } from '@/shared/lib/cn';
import { UIChip } from '@/shared/ui';

/** Выбор колонки на телефоне: там видна одна колонка, рядом — число задач в ней. */
export function PhoneColumnChips({
  tasks,
  value,
  onSelect,
}: {
  readonly tasks: readonly TaskCard[];
  readonly value: TaskStatus;
  readonly onSelect: (status: TaskStatus) => void;
}) {
  const columns = groupTasksByStatus(tasks);
  return TASK_STATUSES.map((status) => (
    <UIChip
      key={status}
      variant='status'
      pressed={value === status}
      onClick={() => onSelect(status)}
    >
      <span
        aria-hidden='true'
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          TASK_STATUS_DOT_CLASS[status],
        )}
      />
      {TASK_STATUS_LABELS[status]}{' '}
      <span className='rounded-full bg-muted px-1.5 text-micro text-muted-foreground tabular-nums'>
        {columns[status].length}
      </span>
    </UIChip>
  ));
}
