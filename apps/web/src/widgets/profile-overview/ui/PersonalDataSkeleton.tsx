import { UICard, UISkeleton } from '@/shared/ui';

export function PersonalDataSkeleton() {
  return (
    <UICard padding='lg' className='flex flex-col gap-5'>
      <UICard.Title>Личные данные</UICard.Title>
      <div className='flex items-center gap-4'>
        <UISkeleton className='size-avatar-xl shrink-0 rounded-full' />
        <UISkeleton className='h-10 w-40' />
      </div>
      <div className='flex flex-col gap-4'>
        <div className='grid grid-cols-1 gap-4 w640:grid-cols-2'>
          {['name', 'email', 'job', 'timezone'].map((key) => (
            <div key={key} className='flex flex-col gap-1'>
              <UISkeleton className='h-[1.43em] w-24' />
              <UISkeleton className='h-control w-full' />
            </div>
          ))}
        </div>
        <UISkeleton className='h-control w-28' />
      </div>
    </UICard>
  );
}
