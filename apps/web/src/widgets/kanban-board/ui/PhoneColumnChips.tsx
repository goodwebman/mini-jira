import type { TaskCard, TaskStatus } from '@gwmt/contracts';

import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  groupTasksByStatus,
} from '@/entities/task';
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
      {TASK_STATUS_LABELS[status]} {columns[status].length}
    </UIChip>
  ));
}
