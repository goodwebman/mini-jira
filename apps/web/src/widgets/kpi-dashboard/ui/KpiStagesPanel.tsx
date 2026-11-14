import type { SprintKpi } from '@gwmt/contracts';

import { buildStages } from '@/entities/sprint';
import { UIProgress } from '@/shared/ui';

import { KpiLayout } from './KpiLayout';

/** Где задачи проводят время: средние дни на этапах и самый медленный. */
export function KpiStagesPanel({ kpi }: { readonly kpi: SprintKpi }) {
  const stages = buildStages(kpi);
  return (
    <KpiLayout.Panel area='stages' title='Где задачи проводят время'>
      <div className='flex flex-1 flex-col justify-center gap-3'>
        {stages.rows.map((row) => (
          <div key={row.status} className='flex flex-col gap-1'>
            <div className='flex justify-between gap-2 text-small'>
              <span>{row.label}</span>
              <strong className='font-semibold tabular-nums'>
                {row.value}
              </strong>
            </div>
            <UIProgress
              value={row.pct}
              color={row.color}
              ariaLabel={`${row.label}: ${row.value}`}
            />
          </div>
        ))}
        <p className='m-0 text-caption text-muted-foreground'>{stages.note}</p>
      </div>
    </KpiLayout.Panel>
  );
}
