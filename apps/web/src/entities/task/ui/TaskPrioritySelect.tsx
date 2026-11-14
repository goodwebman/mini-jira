import type { TaskPriority } from '@gwmt/contracts';

import { UISelect } from '@/shared/ui';

import { TASK_PRIORITY_OPTIONS, isTaskPriority } from '../model/task-meta';
import { type SelectBaseProps } from './select-props';

/** Приоритет задачи: поле формы и свойство задачи. */
export function TaskPrioritySelect({
  value,
  onValueChange,
  ...props
}: SelectBaseProps & {
  readonly value: TaskPriority;
  readonly onValueChange: (value: TaskPriority) => void;
}) {
  return (
    <UISelect
      value={value}
      options={TASK_PRIORITY_OPTIONS}
      onValueChange={(next) => {
        if (isTaskPriority(next)) onValueChange(next);
      }}
      {...props}
    />
  );
}
