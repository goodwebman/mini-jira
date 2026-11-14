import type { TaskStatus } from '@gwmt/contracts';

import { UIStatusBadge } from '@/shared/ui';

import { TASK_STATUS_LABELS } from '../model/task-meta';

export function TaskStatusBadge({ status }: { readonly status: TaskStatus }) {
  return (
    <UIStatusBadge status={status}>{TASK_STATUS_LABELS[status]}</UIStatusBadge>
  );
}
