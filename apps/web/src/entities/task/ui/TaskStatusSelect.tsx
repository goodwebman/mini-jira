import type { TaskStatus } from '@gwmt/contracts';

import { UISelect } from '@/shared/ui';

import { TASK_STATUS_OPTIONS, isTaskStatus } from '../model/task-meta';
import { type SelectBaseProps } from './select-props';

/** Статус задачи. `statuses` сужает список до разрешённых переходов. */
export function TaskStatusSelect({
  value,
  onValueChange,
  statuses,
  ...props
}: SelectBaseProps & {
  readonly value: TaskStatus;
  readonly onValueChange: (value: TaskStatus) => void;
  readonly statuses?: readonly TaskStatus[];
}) {
  return (
    <UISelect
      value={value}
      options={
        statuses
          ? TASK_STATUS_OPTIONS.filter((option) =>
              statuses.includes(option.value),
            )
          : TASK_STATUS_OPTIONS
      }
      onValueChange={(next) => {
        if (isTaskStatus(next)) onValueChange(next);
      }}
      {...props}
    />
  );
}
