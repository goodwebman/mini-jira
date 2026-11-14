import { UISkeleton } from '@/shared/ui';

export function KpiSkeleton() {
  return (
    <div
      aria-busy='true'
      aria-label='Загрузка метрик'
      className='grid grid-cols-12 gap-section'
    >
      <UISkeleton className='col-span-12 h-control max-w-md' />
      {['a', 'b', 'c', 'd'].map((key) => (
        <UISkeleton key={key} className='col-span-6 h-28 md:col-span-3' />
      ))}
      <UISkeleton className='col-span-12 h-80 lg:col-span-8' />
      <UISkeleton className='col-span-12 h-80 lg:col-span-4' />
    </div>
  );
}
