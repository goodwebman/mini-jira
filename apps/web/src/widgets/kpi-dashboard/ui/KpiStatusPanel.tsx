import type { SprintKpi } from '@gwmt/contracts';

import { buildStatusDonut } from '@/entities/sprint';
import { formatSp } from '@/shared/lib/format';
import { UIChartLegend, UIDonutChart } from '@/shared/ui';

import { KpiLayout } from './KpiLayout';

/** Статус спринта: доля закрытого объёма и SP по колонкам. */
export function KpiStatusPanel({ kpi }: { readonly kpi: SprintKpi }) {
  const donut = buildStatusDonut(kpi);
  return (
    <KpiLayout.Panel area='donut' title='Статус спринта'>
      <div className='flex flex-1 flex-wrap items-center justify-center gap-x-6 gap-y-4'>
        <UIDonutChart
          ariaLabel={`Закрыто ${String(donut.donePct)} процентов объёма спринта`}
          value={`${String(donut.donePct)}%`}
          caption='закрыто'
          segments={donut.segments}
        />
        <UIChartLegend
          variant='list'
          className='min-w-0 flex-[1_1_150px]'
          items={donut.segments.map((segment) => ({
            id: segment.status,
            label: segment.label,
            color: segment.color,
            marker: 'square',
            value: formatSp(segment.value),
          }))}
        />
      </div>
    </KpiLayout.Panel>
  );
}
