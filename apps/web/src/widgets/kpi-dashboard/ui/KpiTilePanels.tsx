import type { SprintKpi } from '@gwmt/contracts';

import { buildKpiTiles } from '@/entities/sprint';
import { UIStat } from '@/shared/ui';

import { KpiLayout } from './KpiLayout';

/** Четыре плитки сверху: выполнено, прогноз или итог, изменение объёма, цикл. */
export function KpiTilePanels({ kpi }: { readonly kpi: SprintKpi }) {
  return buildKpiTiles(kpi).map((tile) => (
    <KpiLayout.Panel key={tile.id} area='tile'>
      <UIStat
        label={tile.label}
        value={tile.value}
        sub={tile.sub}
        progress={tile.progress}
      />
    </KpiLayout.Panel>
  ));
}
