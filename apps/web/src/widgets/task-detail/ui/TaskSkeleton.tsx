import { Fragment } from 'react';

import { UICard, UISkeleton } from '@/shared/ui';

import { TaskLayout } from './TaskLayout';

export function TaskSkeleton() {
  return (
    <TaskLayout
      summary={
        <UICard padding='lg' className='flex flex-col gap-3'>
          <div className='flex items-center gap-2'>
            <UISkeleton className='h-6 w-24' />
            <UISkeleton className='h-5 w-24' />
            <UISkeleton className='ml-auto h-control w-28' />
          </div>
          <UISkeleton className='h-[1.2em] w-3/4 text-display' />
          <UISkeleton className='h-24 w-full' />
        </UICard>
      }
      properties={
        <UICard className='grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 xl:grid-cols-[128px_minmax(0,1fr)]'>
          <UISkeleton className='col-span-full h-[calc(24px+var(--fs-lead)*1.43)]' />
          {[
            'status',
            'priority',
            'sp',
            'author',
            'reviewer',
            'tester',
            'designer',
          ].map((key) => (
            <Fragment key={key}>
              <UISkeleton className='h-[1.43em] w-3/4' />
              <UISkeleton className='h-control w-full' />
            </Fragment>
          ))}
          {['created', 'board'].map((key) => (
            <Fragment key={key}>
              <UISkeleton className='h-[1.43em] w-3/4' />
              <UISkeleton className='h-[1.43em] w-full' />
            </Fragment>
          ))}
        </UICard>
      }
      links={
        <UICard padding='lg' className='flex flex-col gap-3'>
          <UISkeleton className='h-control w-48' />
          <UISkeleton className='h-8 w-full' />
        </UICard>
      }
      comments={
        <UICard padding='lg' className='flex flex-col gap-3'>
          <UISkeleton className='h-5 w-40' />
          <UISkeleton className='h-textarea-min w-full' />
          <UISkeleton className='h-control w-32' />
        </UICard>
      }
    />
  );
}
