import type { TaskDetail } from '@gwmt/contracts';

import {
  SP_SECONDS,
  getTaskIntervalTime,
  getTaskSpentSec,
} from '@/entities/task';
import {
  countLabel,
  formatDateTime,
  formatDuration,
} from '@/shared/lib/format';
import { UICard } from '@/shared/ui';

import { TaskTimeHistoryRow } from './TaskTimeHistoryRow';

export function TaskTimeHistoryCard({
  task,
  now,
  timeZone,
}: {
  readonly task: TaskDetail;
  readonly now: number;
  readonly timeZone: string;
}) {
  const spentSec = getTaskSpentSec(task.status, task.timer, now);
  const pausedSec = task.timeHistory.reduce(
    (sum, interval) =>
      sum + getTaskIntervalTime(interval, task.timer.pausedAt, now).pausedSec,
    0,
  );
  const starts = task.timeHistory.filter(
    (interval) => interval.status === 'work',
  );
  const overEstimate = spentSec > task.sp * SP_SECONDS;
  return (
    <UICard padding='lg' className='flex flex-col gap-3'>
      <UICard.Title as='h3' size='sm'>
        Время задачи
      </UICard.Title>
      <dl className='m-0 grid grid-cols-2 gap-3 sm:grid-cols-3'>
        <div>
          <dt className='text-small text-muted-foreground'>
            Затрачено без пауз
          </dt>
          <dd
            title={`${String(spentSec)} с`}
            className={
              overEstimate
                ? 'm-0 font-semibold text-destructive'
                : 'm-0 font-semibold'
            }
          >
            {formatDuration(spentSec / 60)}
          </dd>
        </div>
        <div>
          <dt className='text-small text-muted-foreground'>На паузе</dt>
          <dd className='m-0 font-semibold' title={`${String(pausedSec)} с`}>
            {formatDuration(pausedSec / 60)}
          </dd>
        </div>
        <div>
          <dt className='text-small text-muted-foreground'>Взята в работу</dt>
          <dd className='m-0 font-semibold'>
            {countLabel(starts.length, ['раз', 'раза', 'раз'])}
          </dd>
        </div>
      </dl>
      {overEstimate && (
        <p className='m-0 text-small text-destructive'>
          Затраченное время превысило оценку {task.sp} SP ·{' '}
          {formatDuration((task.sp * SP_SECONDS) / 60)}
        </p>
      )}
      <p className='m-0 text-small text-muted-foreground'>
        {starts[0]
          ? `Впервые в работе: ${formatDateTime(starts[0].enteredAt, timeZone)}`
          : 'Задачу ещё не брали в работу'}
      </p>
      <details>
        <summary className='cursor-pointer rounded-control text-small font-medium focus-ring'>
          История статусов и пауз · {task.timeHistory.length}
        </summary>
        <ol className='m-0 mt-3 flex list-none flex-col gap-3 p-0'>
          {task.timeHistory.map((interval) => (
            <TaskTimeHistoryRow
              key={interval.id}
              interval={interval}
              pausedAt={task.timer.pausedAt}
              now={now}
              timeZone={timeZone}
            />
          ))}
        </ol>
      </details>
    </UICard>
  );
}
