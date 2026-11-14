import type { SprintKpi } from '@gwmt/contracts';

import { buildFlow } from '@/entities/sprint';
import { formatSp } from '@/shared/lib/format';
import { UIAreaChart, UIChartLegend } from '@/shared/ui';

import { KpiLayout } from './KpiLayout';

/** Накопительный поток: объём по статусам на каждый день спринта. */
export function KpiFlowPanel({ kpi }: { readonly kpi: SprintKpi }) {
  const flow = buildFlow(kpi);
  return (
    <KpiLayout.Panel
      area='flow'
      title='Накопительный поток, SP'
      legend={
        <UIChartLegend
          items={flow.series.map((series) => ({
            id: series.name,
            label: series.name,
            color: series.color,
            marker: 'square',
          }))}
        />
      }
    >
      <UIAreaChart
        ariaLabel='Накопительный поток задач по статусам'
        labels={flow.labels}
        series={flow.series}
        formatValue={formatSp}
      />
    </KpiLayout.Panel>
  );
}
