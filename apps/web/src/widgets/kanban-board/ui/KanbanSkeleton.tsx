import { TASK_STATUSES, TASK_STATUS_LABELS } from '@/entities/task';
import { UIKanbanColumn, UISkeleton } from '@/shared/ui';

import { BoardLayout } from './BoardLayout';

export function KanbanSkeleton() {
  return (
    <div
      aria-busy='true'
      aria-label='Загрузка задач'
      className='flex min-h-0 flex-1 flex-col gap-3'
    >
      <BoardLayout.PhoneColumns>
        {TASK_STATUSES.map((status) => (
          <UISkeleton
            key={status}
            className='h-chip w-28 shrink-0 rounded-full'
          />
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
              <UISkeleton key={key} className='h-40 shrink-0 rounded-card' />
            ))}
          </UIKanbanColumn>
        ))}
      </BoardLayout.Columns>
    </div>
  );
}
