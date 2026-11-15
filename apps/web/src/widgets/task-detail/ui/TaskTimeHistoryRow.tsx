import type { TaskTimeInterval } from '@gwmt/contracts';

import {
  TASK_STATUS_LABELS,
  getTaskIntervalTime,
  isActiveTaskStatus,
} from '@/entities/task';
import { formatDateTime, formatDuration } from '@/shared/lib/format';

export function TaskTimeHistoryRow({
  interval,
  pausedAt,
  now,
  timeZone,
}: {
  readonly interval: TaskTimeInterval;
  readonly pausedAt: null | string;
  readonly now: number;
  readonly timeZone: string;
}) {
  const time = getTaskIntervalTime(interval, pausedAt, now);
  return (
    <li className='flex flex-col gap-1 border-l-2 border-border pl-3 text-small'>
      <strong>
        {TASK_STATUS_LABELS[interval.status]} · {interval.changedBy.name}
      </strong>
      <span className='text-muted-foreground'>
        {formatDateTime(interval.enteredAt, timeZone)} —{' '}
        {interval.leftAt ? formatDateTime(interval.leftAt, timeZone) : 'сейчас'}
      </span>
      <span>
        {isActiveTaskStatus(interval.status)
          ? `Работа: ${formatDuration(time.activeSec / 60)}`
          : `В статусе: ${formatDuration(time.elapsedSec / 60)}`}{' '}
        · Пауза: {formatDuration(time.pausedSec / 60)}
      </span>
      {interval.pauses.map((pause) => (
        <span key={pause.id} className='text-muted-foreground'>
          Пауза: {formatDateTime(pause.startedAt, timeZone)} —{' '}
          {pause.endedAt ? formatDateTime(pause.endedAt, timeZone) : 'сейчас'} ·{' '}
          {formatDuration(
            Math.max(
              0,
              (pause.endedAt ? Date.parse(pause.endedAt) : now) -
                Date.parse(pause.startedAt),
            ) / 60_000,
          )}
        </span>
      ))}
    </li>
  );
}
