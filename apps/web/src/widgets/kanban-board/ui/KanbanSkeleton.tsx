import { TASK_STATUSES, TASK_STATUS_LABELS } from '@/entities/task';
import { UIChip, UIKanbanColumn, UISkeleton } from '@/shared/ui';
import { TaskCardSkeleton } from './TaskCardSkeleton';

import { BoardLayout } from './BoardLayout';

export function KanbanSkeleton() {
  return (
    <>
      <BoardLayout.PhoneColumns>
        {TASK_STATUSES.map((status) => (
          <UISkeleton key={status} className='shrink-0 rounded-full'><span className='invisible inline-flex'><UIChip variant='status' tabIndex={-1}>{TASK_STATUS_LABELS[status]} 0</UIChip></span></UISkeleton>
        ))}
      </BoardLayout.PhoneColumns>
      <BoardLayout.Columns>
        {TASK_STATUSES.map((status, index) => (
          <UIKanbanColumn
            key={status}
            status={status}
            title={TASK_STATUS_LABELS[status]}
            className={index === 0 ? undefined : 'max-sm:hidden'}
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
