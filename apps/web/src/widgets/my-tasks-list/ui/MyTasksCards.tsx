import type { TaskRow } from '@gwmt/contracts';
import { Link } from 'react-router';

import {
  TASK_PRIORITY_LABELS,
  TaskStatusBadge,
  TaskTimerBadge,
  getTaskTimerView,
  taskRolesLabel,
} from '@/entities/task';
import { formatNumber } from '@/shared/lib/format';
import { ROUTES } from '@/shared/routes';
import { UIPriority } from '@/shared/ui';

/** Свои задачи на телефоне: карточки вместо таблицы. */
export function MyTasksCards({
  rows,
  now,
}: {
  readonly rows: readonly TaskRow[];
  readonly now: number;
}) {
  return (
    <ul className='m-0 flex list-none flex-col overflow-hidden rounded-block border border-border bg-surface p-0 sm:hidden'>
      {rows.map((row) => (
        <li key={row.id} className='border-b border-border last:border-b-0'>
          <Link
            to={ROUTES.TASK.build(row.key)}
            className='flex flex-col gap-1.5 p-3 text-foreground no-underline focus-ring'
          >
            <span className='flex items-center gap-1.5 text-caption text-muted-foreground'>
              <UIPriority
                priority={row.priority}
                label={TASK_PRIORITY_LABELS[row.priority]}
              />
              <span className='font-medium'>{row.key}</span>
              <span>· {taskRolesLabel(row.roles)}</span>
              <span className='ml-auto'>{formatNumber(row.sp)} SP</span>
            </span>
            <span className='font-medium'>{row.title}</span>
            <span className='flex items-center justify-between gap-2'>
              <TaskStatusBadge status={row.status} />
              <TaskTimerBadge
                compact
                view={getTaskTimerView(row.status, row.timer, now)}
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
