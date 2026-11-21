import type { SprintKpi } from '@gwmt/contracts';

import { buildKpiTiles } from '@/entities/sprint';
import { UIStat } from '@/shared/ui';

import { SPANS } from './KpiLayout/spans';

/** Четыре плитки сверху: выполнено, прогноз или итог, изменение объёма, цикл. */
export function KpiTilePanels({ kpi }: { readonly kpi: SprintKpi }) {
  return buildKpiTiles(kpi).map((tile) => (
    <UIStat
      key={tile.id}
      className={SPANS.tile}
      label={tile.label}
      value={tile.value}
      sub={tile.sub}
      progress={tile.progress}
    />
  ));
}
