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
        aria-haspopup='dialog'
        onClick={onPick}
        className='flex min-h-control max-w-full cursor-pointer items-center gap-2 rounded-control border border-border-strong bg-surface p-2 text-start transition-colors duration-150 focus-ring hover:bg-background max-w640:w-full'
      >
        <BoardIconTile colorIndex={kpi.board.colorIndex} size='sm' />
        <span className='flex min-w-0 flex-1 flex-col gap-1 w640:flex-row w640:items-center w640:gap-2'>
          <span className='line-clamp-2 min-w-0 font-medium wrap-anywhere w640:line-clamp-1'>
            {kpi.board.name}
          </span>
          <span className='shrink-0 text-caption text-muted-foreground w640:border-s w640:border-border w640:ps-2 w640:text-small'>
            Спринт {kpi.sprint.number}
          </span>
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
