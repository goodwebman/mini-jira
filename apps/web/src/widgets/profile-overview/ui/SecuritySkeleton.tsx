import { UICard, UISkeleton } from '@/shared/ui';

export function SecuritySkeleton() {
  return (
    <UICard padding='lg' className='flex flex-col gap-4'>
      <UICard.Title>Безопасность</UICard.Title>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        {['current', 'new', 'confirm'].map((key) => (
          <div
            key={key}
            className={
              key === 'current'
                ? 'flex flex-col gap-1 sm:col-span-2'
                : 'flex flex-col gap-1'
            }
          >
            <UISkeleton className='h-[1.43em] w-36' />
            <UISkeleton className='h-control w-full' />
          </div>
        ))}
      </div>
      <UISkeleton className='h-control w-40' />
    </UICard>
  );
}
