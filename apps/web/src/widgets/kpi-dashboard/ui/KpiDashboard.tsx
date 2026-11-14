import { useState } from 'react';

import type { SprintKpi } from '@gwmt/contracts';

import {
  type KpiSelection,
  KpiSprintPickerDialog,
} from '@/features/sprint/pick-sprint';
import { UIEmptyState } from '@/shared/ui';

import { KpiCharts } from './KpiCharts';
import { KpiSelectionBar } from './KpiSelectionBar';

/** Метрики выбранного спринта; выбор другого пишется в адрес. */
export function KpiDashboard({
  boardId,
  sprint,
  kpi,
  onSelect,
}: {
  readonly boardId: number;
  readonly sprint: number;
  readonly kpi: SprintKpi;
  readonly onSelect: (selection: KpiSelection) => void;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <>
      <KpiSelectionBar kpi={kpi} onPick={() => setPicking(true)} />
      {kpi.isEmpty ? (
        <UIEmptyState
          boxed
          title='В этом спринте пока нет задач'
          description='Создайте первую, и метрики появятся здесь.'
        />
      ) : (
        <KpiCharts kpi={kpi} />
      )}
      <KpiSprintPickerDialog
        open={picking}
        onOpenChange={setPicking}
        value={{ boardId, sprint }}
        onSubmit={onSelect}
      />
    </>
  );
}
