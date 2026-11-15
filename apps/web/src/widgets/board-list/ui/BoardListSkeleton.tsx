import { UISkeleton } from '@/shared/ui';

export function BoardListSkeleton() {
  return (
    <div className='flex flex-col gap-3'>
      <div className='flex flex-wrap gap-2'>
        <UISkeleton className='h-control min-w-0 flex-[1_1_200px]' />
        <UISkeleton className='h-control min-w-[140px] flex-[0_1_220px]' />
      </div>
      <div className='flex flex-col gap-0.5 rounded-block border border-border bg-surface p-2'>
        {['a', 'b', 'c', 'd'].map((key) => (
          <UISkeleton
            key={key}
            className='h-[calc(var(--avatar-lg)+20px)] rounded-card'
          />
        ))}
      </div>
    </div>
  );
}
