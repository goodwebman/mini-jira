import { UICard, UISkeleton } from '@/shared/ui';

import { MembersLayout } from './MembersLayout';
import { RolesLegendCard } from './RolesLegendCard';

export function MembersSkeleton() {
  return (
    <MembersLayout
      members={
        <UICard className='flex flex-col'>
          <UISkeleton className='mb-2 h-6 w-40' />
          {['a', 'b', 'c', 'd'].map((key) => (
            <div
              key={key}
              className='flex min-h-control-lg items-center gap-3 border-t border-border py-3'
            >
              <UISkeleton className='size-avatar-md shrink-0 rounded-full' />
              <UISkeleton className='h-5 flex-1' />
              <UISkeleton className='h-control w-32' />
            </div>
          ))}
        </UICard>
      }
      aside={
        <>
          <UICard className='flex flex-col gap-3'>
            <UISkeleton className='h-6 w-48' />
            <UISkeleton className='h-control w-full' />
            <div className='flex flex-col gap-1'>
              <UISkeleton className='h-[1.43em] w-36' />
              <UISkeleton className='h-control w-full' />
            </div>
            <UISkeleton className='h-14 w-full' />
          </UICard>
          <RolesLegendCard />
        </>
      }
    />
  );
}
