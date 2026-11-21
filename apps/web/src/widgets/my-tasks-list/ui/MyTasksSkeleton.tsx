import { UISkeleton } from '@/shared/ui';

import { MyTasksCards } from './MyTasksCards';
import { MyTasksLayout } from './MyTasksLayout';
import { MyTasksTable } from './MyTasksTable';

export function MyTasksSkeleton() {
  return (
    <MyTasksLayout>
      <MyTasksLayout.Filters>
        <UISkeleton className='h-control min-w-0 flex-[1_1_200px] w640:max-w-[320px] w1920:max-w-[420px]' />
        {['status', 'role'].map((key) => (
          <UISkeleton
            key={key}
            className='h-control min-w-0 flex-[1_1_140px] w640:max-w-[200px]'
          />
        ))}
      </MyTasksLayout.Filters>
      <MyTasksTable loading rows={[]} now={0} timeZone='UTC' />
      <MyTasksCards loading rows={[]} now={0} />
    </MyTasksLayout>
  );
}
