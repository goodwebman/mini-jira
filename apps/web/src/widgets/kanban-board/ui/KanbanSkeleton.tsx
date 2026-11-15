import type { BoardRole, TaskStatus } from '@gwmt/contracts';

import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  canCreateInStatus,
} from '@/entities/task';
import { UIChip, UIKanbanColumn, UISkeleton } from '@/shared/ui';

import { BoardLayout } from './BoardLayout';
import { TaskCardSkeleton } from './TaskCardSkeleton';

export function KanbanSkeleton({
  role = 'admin',
  phoneColumn = 'todo',
}: {
  readonly role?: BoardRole;
  readonly phoneColumn?: TaskStatus;
}) {
  return (
    <>
      <BoardLayout.PhoneColumns>
        {TASK_STATUSES.map((status) => (
          <UISkeleton key={status} className='shrink-0 rounded-full'>
            <span className='invisible inline-flex'>
              <UIChip variant='status' tabIndex={-1}>
                {TASK_STATUS_LABELS[status]} 0
              </UIChip>
            </span>
          </UISkeleton>
        ))}
      </BoardLayout.PhoneColumns>
      <BoardLayout.Columns loading>
        {TASK_STATUSES.map((status) => (
          <UIKanbanColumn
            key={status}
            status={status}
            title={TASK_STATUS_LABELS[status]}
            className={status === phoneColumn ? undefined : 'max-sm:hidden'}
            onAdd={canCreateInStatus(role, status) ? () => {} : undefined}
            aria-hidden='true'
          >
            {['a', 'b', 'c'].map((key) => (
              <TaskCardSkeleton key={key} />
            ))}
          </UIKanbanColumn>
        ))}
      </BoardLayout.Columns>
    </>
  );
}
