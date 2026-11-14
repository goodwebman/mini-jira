import type { TaskStatus, TaskTimer } from '@gwmt/contracts';

import { formatDuration } from '@/shared/lib/format';

export type TaskTimerTone =
  'accent' | 'neutral' | 'review' | 'success' | 'test' | 'warning';

export interface TaskTimerView {
  /** «В работе 2 ч 10 мин» — для карточки и панели задачи. */
  readonly label: string;
  /** «2 ч 10 мин» — для узкой колонки таблицы. */
  readonly short: string;
  readonly tone: TaskTimerTone;
  readonly icon: 'check' | 'clock' | 'pause';
  readonly isPaused: boolean;
  /** Статус позволяет паузу: work, review, test. Права пользователя проверяются отдельно. */
  readonly canToggle: boolean;
}

const RUNNING: Record<
  Exclude<TaskStatus, 'done'>,
  { readonly prefix: string; readonly tone: TaskTimerTone }
> = {
  todo: { prefix: 'Ждёт', tone: 'neutral' },
  work: { prefix: 'В работе', tone: 'accent' },
  review: { prefix: 'На ревью', tone: 'review' },
  test: { prefix: 'В тесте', tone: 'test' },
};

const MS_IN_MINUTE = 60_000;

/**
 * Подпись таймера задачи по контракту: X = serverNow − statusEnteredAt − pausedTotalSec,
 * на паузе X = serverNow − pausedAt. `nowMs` — время сервера, см. `useServerNow`.
 */
export function getTaskTimerView(
  status: TaskStatus,
  timer: TaskTimer,
  nowMs: number,
): TaskTimerView {
  if (status === 'done') {
    const days = Math.max(1, timer.completedInDays ?? 1);
    return {
      label: `Сделана за ${String(days)} д`,
      short: `${String(days)} д`,
      tone: 'success',
      icon: 'check',
      isPaused: false,
      canToggle: false,
    };
  }

  if (timer.pausedAt !== null) {
    const paused = formatDuration(
      (nowMs - Date.parse(timer.pausedAt)) / MS_IN_MINUTE,
    );
    return {
      label: `На паузе ${paused}`,
      short: `Пауза ${paused}`,
      tone: 'warning',
      icon: 'pause',
      isPaused: true,
      canToggle: timer.canPause,
    };
  }

  const elapsed = formatDuration(
    (nowMs - Date.parse(timer.statusEnteredAt)) / MS_IN_MINUTE -
      timer.pausedTotalSec / 60,
  );
  const { prefix, tone } = RUNNING[status];
  return {
    label: `${prefix} ${elapsed}`,
    short: elapsed,
    tone,
    icon: 'clock',
    isPaused: false,
    canToggle: timer.canPause,
  };
}
