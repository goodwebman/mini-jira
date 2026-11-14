import type { TaskStatus } from '@gwmt/contracts';

import { UISelect } from '@/shared/ui';

import { TASK_STATUS_OPTIONS, isTaskStatus } from '../model/task-meta';
import { ALL, type All, type SelectBaseProps } from './select-props';

/** Фильтр по статусу: первым идёт «Все статусы». */
export function TaskStatusFilter({
  value,
  onValueChange,
  ...props
}: SelectBaseProps & {
  readonly value: All | TaskStatus;
  readonly onValueChange: (value: All | TaskStatus) => void;
}) {
  return (
    <UISelect
      aria-label='Статус'
      value={value}
      options={[{ value: ALL, label: 'Все статусы' }, ...TASK_STATUS_OPTIONS]}
      onValueChange={(next) => {
        if (next === ALL || isTaskStatus(next)) onValueChange(next);
      }}
      {...props}
    />
  );
}
