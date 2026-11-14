import type { SprintKpi } from '@gwmt/contracts';

import { buildTeam } from '@/entities/sprint';
import { UserAvatar } from '@/entities/user';
import { UIProgress } from '@/shared/ui';

import { KpiLayout } from './KpiLayout';

const GRID =
  'grid grid-cols-[minmax(0,1fr)_56px_52px_52px] gap-x-2 xl:grid-cols-[minmax(0,1fr)_64px_64px_64px]';

/** Вклад участников: закрытые SP, ревью и тесты, полоса — доля от лидера. */
export function KpiTeamPanel({ kpi }: { readonly kpi: SprintKpi }) {
  const team = buildTeam(kpi);
  return (
    <KpiLayout.Panel area='team' title='Вклад участников'>
      <div
        className={`${GRID} text-caption font-semibold text-muted-foreground`}
      >
        <span>Участник</span>
        <span className='text-right'>SP</span>
        <span className='text-right'>Ревью</span>
        <span className='text-right'>Тесты</span>
      </div>
      {team.length === 0 && (
        <p className='m-0 text-muted-foreground'>Пока никто ничего не закрыл</p>
      )}
      {team.map((row) => (
        <div
          key={row.user.id}
          className={`${GRID} min-h-12 items-center border-t border-border text-small tabular-nums`}
        >
          <div className='flex min-w-0 items-center gap-2'>
            <UserAvatar user={row.user} size='sm' />
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
              <span className='truncate'>{row.user.name}</span>
              <UIProgress
                value={row.pct}
                ariaLabel={`Вклад: ${row.doneSp} SP`}
              />
            </div>
          </div>
          <strong className='text-right font-semibold'>{row.doneSp}</strong>
          <span className='text-right'>{row.reviews}</span>
          <span className='text-right'>{row.tests}</span>
        </div>
      ))}
    </KpiLayout.Panel>
  );
}
