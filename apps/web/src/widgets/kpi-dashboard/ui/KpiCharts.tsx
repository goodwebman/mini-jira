import type { SprintKpi } from '@gwmt/contracts';

import { KpiBurndownPanel } from './KpiBurndownPanel';
import { KpiFlowPanel } from './KpiFlowPanel';
import { KpiLayout } from './KpiLayout';
import { KpiStagesPanel } from './KpiStagesPanel';
import { KpiStatusPanel } from './KpiStatusPanel';
import { KpiTeamPanel } from './KpiTeamPanel';
import { KpiTilePanels } from './KpiTilePanels';
import { KpiVelocityPanel } from './KpiVelocityPanel';

/** Сетка метрик спринта: порядок и размеры панелей задаёт `KpiLayout`. */
export function KpiCharts({ kpi }: { readonly kpi: SprintKpi }) {
  return (
    <KpiLayout>
      <KpiTilePanels kpi={kpi} />
      <KpiBurndownPanel kpi={kpi} />
      <KpiStatusPanel kpi={kpi} />
      <KpiStagesPanel kpi={kpi} />
      <KpiFlowPanel kpi={kpi} />
      <KpiVelocityPanel kpi={kpi} />
      <KpiTeamPanel kpi={kpi} />
    </KpiLayout>
  );
}
