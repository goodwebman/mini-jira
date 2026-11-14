import type { SprintKpi } from '@gwmt/contracts';

import { buildBurndown, burndownAlt } from '@/entities/sprint';
import { sumSp } from '@/entities/task';
import { formatSp } from '@/shared/lib/format';
import {
  type IUIChartLegendItem,
  type IUILineChartSeries,
  UIChartLegend,
  UILineChart,
} from '@/shared/ui';

import { CHART_COLOR } from '../lib/chart-colors';
import { KpiLayout } from './KpiLayout';

/** Сгорание: осталось, идеал, прогноз до конца активного спринта, добавленный объём. */
export function KpiBurndownPanel({ kpi }: { readonly kpi: SprintKpi }) {
  const view = buildBurndown(kpi);
  const addedSp = sumSp(view.added);

  const legend: IUIChartLegendItem[] = [
    {
      id: 'left',
      label: 'Осталось',
      color: CHART_COLOR.primary,
      marker: 'line',
    },
    {
      id: 'ideal',
      label: 'Идеал',
      color: CHART_COLOR.neutral,
      marker: 'dashed',
    },
  ];
  const series: IUILineChartSeries[] = [
    {
      name: 'Осталось',
      values: view.remaining,
      color: CHART_COLOR.primary,
      area: true,
      endMarker: true,
    },
    {
      name: 'Идеал',
      values: view.ideal,
      color: CHART_COLOR.neutral,
      variant: 'dashed',
    },
  ];
  if (view.forecast) {
    legend.push({
      id: 'forecast',
      label: 'Прогноз',
      color: CHART_COLOR.primary,
      marker: 'dotted',
    });
    series.push({
      name: 'Прогноз',
      values: view.forecast,
      color: CHART_COLOR.primary,
      variant: 'dotted',
    });
  }
  if (addedSp > 0)
    legend.push({
      id: 'added',
      label: 'Добавлено',
      color: CHART_COLOR.added,
      marker: 'dot',
      value: `+${formatSp(addedSp)}`,
    });

  return (
    <KpiLayout.Panel
      area='burndown'
      title='Сгорание спринта, SP'
      legend={<UIChartLegend items={legend} />}
    >
      <UILineChart
        ariaLabel={burndownAlt(view)}
        labels={view.labels}
        formatValue={formatSp}
        series={series}
      />
    </KpiLayout.Panel>
  );
}
