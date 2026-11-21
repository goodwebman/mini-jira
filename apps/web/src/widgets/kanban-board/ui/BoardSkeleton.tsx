import { BoardMembersButton } from '@/entities/board';
import { UISkeleton } from '@/shared/ui';

import { BoardLayout } from './BoardLayout';
import { KanbanSkeleton } from './KanbanSkeleton';

export function BoardSkeleton() {
  return (
    <div aria-hidden='true' className='flex min-h-0 flex-1 flex-col'>
      <BoardLayout>
        <BoardLayout.Toolbar>
          <UISkeleton className='h-control min-w-0 flex-[1_1_100%] w640:max-w-[320px] w640:flex-[1_1_200px] w1920:max-w-[420px]' />
          <UISkeleton className='h-control min-w-0 flex-[1_1_144px] w640:max-w-[200px] w1920:max-w-[260px]' />
          <UISkeleton className='w-fit shrink-0'>
            <div className='invisible'>
              <BoardMembersButton
                count={0}
                render={<button type='button' disabled tabIndex={-1} />}
              />
            </div>
          </UISkeleton>
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
