import { UISkeleton } from '@/shared/ui';

import { BoardLayout } from './BoardLayout';
import { KanbanSkeleton } from './KanbanSkeleton';

export function BoardSkeleton() {
  return (
    <div aria-hidden='true' className='flex min-h-0 flex-1 flex-col'>
      <BoardLayout>
        <BoardLayout.Toolbar>
          <UISkeleton className='h-control min-w-0 flex-[1_1_220px] sm:max-w-[320px] xl:max-w-[420px]' />
          <UISkeleton className='h-control min-w-0 flex-[1_1_150px] sm:max-w-[200px] xl:max-w-[260px]' />
          <UISkeleton className='h-control w-36' />
        </BoardLayout.Toolbar>
        <BoardLayout.People>
          {['a', 'b', 'c'].map((key) => (
            <UISkeleton
              key={key}
              className='h-chip w-32 shrink-0 rounded-full'
            />
          ))}
        </BoardLayout.People>
        <KanbanSkeleton />
      </BoardLayout>
    </div>
  );
}
