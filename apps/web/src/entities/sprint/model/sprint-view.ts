import type { SprintBrief, SprintKpi } from '@gwmt/contracts';

import { formatDateRange } from '@/shared/lib/format';

export function formatSprintDates(
  sprint: Pick<SprintBrief, 'endDate' | 'startDate'>,
): string {
  return formatDateRange(sprint.startDate, sprint.endDate);
}

/** «Спринт 14 · 3–14 ноя» — подпись шапки доски. */
export function sprintCaption(
  sprint: Pick<SprintBrief, 'endDate' | 'number' | 'startDate'>,
): string {
  return `Спринт ${String(sprint.number)} · ${formatSprintDates(sprint)}`;
}

export interface SprintProgress {
  readonly label: string;
  readonly tone: 'accent' | 'neutral';
}

/** Бейдж рядом с выбором спринта: «Идёт · день 5 из 10» или «Завершён». */
export function sprintProgress(sprint: SprintKpi['sprint']): SprintProgress {
  return sprint.state === 'active'
    ? {
        label: `Идёт · день ${String(sprint.dayNumber)} из ${String(sprint.totalDays)}`,
        tone: 'accent',
      }
    : { label: 'Завершён', tone: 'neutral' };
}
