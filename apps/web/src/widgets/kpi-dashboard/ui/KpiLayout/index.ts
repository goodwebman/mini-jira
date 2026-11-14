import { KpiGrid } from './KpiGrid';
import { KpiPanel } from './KpiPanel';

/** Сетка KPI: `<KpiLayout>` и карточки `<KpiLayout.Panel area="burndown">`. */
export const KpiLayout = Object.assign(KpiGrid, { Panel: KpiPanel });
