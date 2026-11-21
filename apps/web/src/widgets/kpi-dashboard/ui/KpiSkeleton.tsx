import { UICard, UISkeleton } from '@/shared/ui';

import { KpiLayout } from './KpiLayout';
import { SPANS } from './KpiLayout/spans';

export function KpiSkeleton() {
  return (
    <div
      aria-busy='true'
      aria-label='Загрузка метрик'
      className='flex flex-col gap-section'
    >
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
        <UISkeleton className='h-control w-72 max-w-full' />
        <UISkeleton className='h-6 w-24' />
        <UISkeleton className='h-5 w-48' />
      </div>
      <KpiLayout>
        {['a', 'b', 'c', 'd'].map((key) => (
          <UICard
            key={key}
            padding='sm'
            className={`${SPANS.tile} min-w-0 gap-1`}
          >
            <UISkeleton className='h-[1.35em] w-28 max-w-full text-small' />
            <UISkeleton className='h-[1.2em] w-24 max-w-full text-metric' />
            <UISkeleton className='h-[1.34em] w-32 max-w-full text-caption' />
          </UICard>
        ))}
        <KpiLayout.Panel
          area='burndown'
          title={<UISkeleton className='h-5 w-40' />}
        >
          <UISkeleton className='h-[220px] w640:h-[240px] w960:h-[260px] w1280:h-[280px] w1920:h-[340px]' />
        </KpiLayout.Panel>
        <KpiLayout.Panel
          area='donut'
          title={<UISkeleton className='h-5 w-32' />}
        >
          <div className='flex flex-wrap items-center justify-center gap-x-6 gap-y-4'>
            <UISkeleton className='size-donut shrink-0 rounded-full' />
            <UISkeleton className='h-32 min-w-0 flex-[1_1_150px]' />
          </div>
        </KpiLayout.Panel>
        <KpiLayout.Panel
          area='stages'
          title={<UISkeleton className='h-5 w-40' />}
        >
          <div className='flex flex-col gap-3'>
            {['a', 'b', 'c', 'd'].map((key) => (
              <UISkeleton key={key} className='h-8' />
            ))}
            <UISkeleton className='h-4 w-full' />
          </div>
        </KpiLayout.Panel>
        {(['flow', 'velocity'] as const).map((area) => (
          <KpiLayout.Panel
            key={area}
            area={area}
            title={<UISkeleton className='h-5 w-40' />}
          >
            <UISkeleton className='h-[200px] w640:h-[220px] w960:h-[230px] w1280:h-[240px] w1920:h-[300px]' />
          </KpiLayout.Panel>
        ))}
        <KpiLayout.Panel
          area='team'
          title={<UISkeleton className='h-5 w-40' />}
        >
          <UISkeleton className='h-4 w-full' />
          {['a', 'b', 'c'].map((key) => (
            <UISkeleton key={key} className='h-12 w-full' />
          ))}
        </KpiLayout.Panel>
      </KpiLayout>
    </div>
  );
}
