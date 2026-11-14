import type { TaskPriority } from '@gwmt/contracts';

import { UISelect } from '@/shared/ui';

import { TASK_PRIORITY_OPTIONS, isTaskPriority } from '../model/task-meta';
import { ALL, type All, type SelectBaseProps } from './select-props';

/** Фильтр доски по приоритету: первым идёт «Любой приоритет». */
export function TaskPriorityFilter({
  value,
  onValueChange,
  ...props
}: SelectBaseProps & {
  readonly value: All | TaskPriority;
  readonly onValueChange: (value: All | TaskPriority) => void;
}) {
  return (
    <UISelect
      aria-label='Приоритет'
      value={value}
      options={[
        { value: ALL, label: 'Любой приоритет' },
        ...TASK_PRIORITY_OPTIONS,
      ]}
      onValueChange={(next) => {
        if (next === ALL || isTaskPriority(next)) onValueChange(next);
      }}
      {...props}
    />
  );
}
