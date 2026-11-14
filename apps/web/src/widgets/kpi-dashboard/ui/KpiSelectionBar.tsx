import type { SprintKpi } from '@gwmt/contracts';

import { BoardIconTile } from '@/entities/board';
import { formatSprintDates, sprintProgress } from '@/entities/sprint';
import { UIBadge } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

/** «Доска | Спринт ▾», состояние спринта и даты. Клик открывает выбор. */
export function KpiSelectionBar({
  kpi,
  onPick,
}: {
  readonly kpi: Pick<SprintKpi, 'board' | 'sprint'>;
  readonly onPick: () => void;
}) {
  const progress = sprintProgress(kpi.sprint);
  return (
    <div className='flex flex-none flex-wrap items-center gap-x-3 gap-y-2'>
      <button
        type='button'
        onClick={onPick}
        className='flex min-h-control max-w-full cursor-pointer items-center gap-2 rounded-control border border-border-strong bg-surface py-1 pl-1 pr-2 text-left transition-colors duration-150 focus-ring hover:bg-background'
      >
        <BoardIconTile colorIndex={kpi.board.colorIndex} size='sm' />
        <span className='min-w-0 truncate font-semibold'>{kpi.board.name}</span>
        <span
          aria-hidden='true'
          className='h-[18px] w-px flex-none bg-border-strong'
        />
        <span className='flex-none font-semibold'>
          Спринт {kpi.sprint.number}
        </span>
        <UIIcons.ChevronDown
          className='size-icon shrink-0'
          aria-hidden='true'
        />
      </button>
      <UIBadge tone={progress.tone}>{progress.label}</UIBadge>
      <span className='text-small text-muted-foreground'>
        {formatSprintDates(kpi.sprint)}
      </span>
    </div>
  );
}
