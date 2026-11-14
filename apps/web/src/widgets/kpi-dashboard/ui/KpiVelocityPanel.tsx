import type { SprintKpi } from '@gwmt/contracts';

import { buildVelocity } from '@/entities/sprint';
import { formatSp } from '@/shared/lib/format';
import { UIBarChart, UIChartLegend } from '@/shared/ui';

import { CHART_COLOR } from '../lib/chart-colors';
import { KpiLayout } from './KpiLayout';

/** Скорость команды: план и выполнено по последним спринтам, средняя по закрытым. */
export function KpiVelocityPanel({ kpi }: { readonly kpi: SprintKpi }) {
  const velocity = buildVelocity(kpi);
  return (
    <KpiLayout.Panel
      area='velocity'
      title='Скорость команды, SP'
      legend={
        <UIChartLegend
          items={[
            {
              id: 'done',
              label: 'Выполнено',
              color: CHART_COLOR.primary,
              marker: 'square',
            },
            {
              id: 'plan',
              label: 'План',
              color: CHART_COLOR.plan,
              marker: 'square',
            },
          ]}
        />
      }
    >
      <UIBarChart
        ariaLabel='Выполнено и план по последним спринтам'
        labels={velocity.labels}
        highlightIndex={velocity.highlightIndex}
        average={velocity.average ?? undefined}
        formatValue={formatSp}
        series={[
          { name: 'План', values: velocity.planned, color: CHART_COLOR.plan },
          {
            name: 'Выполнено',
            values: velocity.done,
            color: CHART_COLOR.primary,
            mutedColor: CHART_COLOR.soft,
          },
        ]}
      />
    </KpiLayout.Panel>
  );
}
