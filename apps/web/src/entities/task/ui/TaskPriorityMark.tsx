import type { TaskPriority } from '@gwmt/contracts';

import { UIPriority } from '@/shared/ui';

import { TASK_PRIORITY_LABELS } from '../model/task-meta';

/** Иконка приоритета; с `withLabel` — ещё и название рядом. */
export function TaskPriorityMark({
  priority,
  withLabel = false,
}: {
  readonly priority: TaskPriority;
  readonly withLabel?: boolean;
}) {
  const label = TASK_PRIORITY_LABELS[priority];
  return (
    <UIPriority priority={priority} label={label}>
      {withLabel ? label : undefined}
    </UIPriority>
  );
}
