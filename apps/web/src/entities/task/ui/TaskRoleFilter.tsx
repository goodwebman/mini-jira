import type { TaskRole } from '@gwmt/contracts';

import { UISelect } from '@/shared/ui';

import { TASK_ROLE_OPTIONS, isTaskRole } from '../model/task-meta';
import { ALL, type All, type SelectBaseProps } from './select-props';

/** Фильтр «Моя роль» в списке своих задач. */
export function TaskRoleFilter({
  value,
  onValueChange,
  ...props
}: SelectBaseProps & {
  readonly value: All | TaskRole;
  readonly onValueChange: (value: All | TaskRole) => void;
}) {
  return (
    <UISelect
      aria-label='Моя роль'
      value={value}
      options={[{ value: ALL, label: 'Все роли' }, ...TASK_ROLE_OPTIONS]}
      onValueChange={(next) => {
        if (next === ALL || isTaskRole(next)) onValueChange(next);
      }}
      {...props}
    />
  );
}
