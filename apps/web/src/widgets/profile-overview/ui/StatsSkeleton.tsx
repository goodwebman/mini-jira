import { UICard, UISkeleton } from '@/shared/ui';

export function StatsSkeleton() {
  return (
    <>
      <UICard className='flex flex-col gap-3'>
        <UICard.Title as='h2' size='sm'>
          Мои задачи сейчас
        </UICard.Title>
        <div className='grid grid-cols-3 gap-3'>
          {['open', 'closed', 'sp'].map((key) => (
            <div key={key} className='flex flex-col gap-1'>
              <UISkeleton className='h-9 w-12' />
              <UISkeleton className='h-4 w-16' />
            </div>
          ))}
        </div>
      </UICard>
      <UICard className='flex flex-col gap-1'>
        <UICard.Title as='h2' size='sm' className='pb-2'>
          Последние задачи
        </UICard.Title>
        {['a', 'b', 'c'].map((key) => (
          <div
            key={key}
            className='flex min-h-control-lg items-center border-t border-border'
          >
            <UISkeleton className='h-5 w-full' />
          </div>
        ))}
      </UICard>
    </>
  );
}
