import type { TaskRow } from '@gwmt/contracts';
import { Link } from 'react-router';

import {
  SP_SECONDS,
  TASK_PRIORITY_LABELS,
  TaskStatusBadge,
  TaskTimerBadge,
  getTaskSpentSec,
  getTaskTimerView,
  taskRolesLabel,
} from '@/entities/task';
import { formatNumber, formatShortDate } from '@/shared/lib/format';
import { ROUTES } from '@/shared/routes';
import { UIPriority, UISkeleton, UITable } from '@/shared/ui';

/**
 * Таблица своих задач. Набор колонок растёт с шириной экрана, как в макетах:
 * 640 — ключ, задача, статус; 960 — + время, приоритет, SP; 1440 — + роль, дата;
 * 1920 — + доска. На телефоне вместо таблицы — `MyTasksCards`.
 */
export function MyTasksTable({
  rows,
  now,
  timeZone,
  loading = false,
}: {
  readonly rows: readonly TaskRow[];
  readonly now: number;
  readonly timeZone: string;
  readonly loading?: boolean;
}) {
  return (
    <UITable aria-busy={loading} wrapperClassName='hidden sm:block'>
      <UITable.Head>
        <UITable.Row>
          <UITable.HeadCell className='w-[88px]'>Ключ</UITable.HeadCell>
          <UITable.HeadCell>Задача</UITable.HeadCell>
          <UITable.HeadCell className='hidden xl:table-cell'>
            Доска
          </UITable.HeadCell>
          <UITable.HeadCell className='hidden lg:table-cell'>
            Роль
          </UITable.HeadCell>
          <UITable.HeadCell>Статус</UITable.HeadCell>
          <UITable.HeadCell className='hidden md:table-cell'>
            Время
          </UITable.HeadCell>
          <UITable.HeadCell>
            <span className='max-md:sr-only'>Приоритет</span>
          </UITable.HeadCell>
          <UITable.HeadCell className='hidden text-right md:table-cell'>
            SP
          </UITable.HeadCell>
          <UITable.HeadCell className='hidden lg:table-cell'>
            Создана
          </UITable.HeadCell>
        </UITable.Row>
      </UITable.Head>
      <UITable.Body>
        {loading &&
          ['a', 'b', 'c', 'd', 'e', 'f'].map((key) => (
            <UITable.Row key={key}>
              <UITable.Cell>
                <UISkeleton className='h-4 w-16' />
              </UITable.Cell>
              <UITable.Cell>
                <UISkeleton className='h-4 w-full' />
              </UITable.Cell>
              <UITable.Cell className='hidden xl:table-cell'>
                <UISkeleton className='h-4 w-24' />
              </UITable.Cell>
              <UITable.Cell className='hidden lg:table-cell'>
                <UISkeleton className='h-4 w-20' />
              </UITable.Cell>
              <UITable.Cell>
                <UISkeleton className='h-6 w-24' />
              </UITable.Cell>
              <UITable.Cell className='hidden md:table-cell'>
                <UISkeleton className='h-6 w-20' />
              </UITable.Cell>
              <UITable.Cell>
                <UISkeleton className='h-4 w-12' />
              </UITable.Cell>
              <UITable.Cell className='hidden md:table-cell'>
                <UISkeleton className='h-4 w-6' />
              </UITable.Cell>
              <UITable.Cell className='hidden lg:table-cell'>
                <UISkeleton className='h-4 w-20' />
              </UITable.Cell>
            </UITable.Row>
          ))}
        {rows.map((row) => (
          <UITable.Row key={row.id} interactive>
            <UITable.Cell className='font-medium text-muted-foreground'>
              {row.key}
            </UITable.Cell>
            <UITable.Cell className='max-w-0 font-medium'>
              <UITable.RowLink
                render={<Link to={ROUTES.TASK.build(row.key)} />}
              >
                <span className='block truncate'>{row.title}</span>
              </UITable.RowLink>
            </UITable.Cell>
            <UITable.Cell className='hidden xl:table-cell'>
              {row.board.name}
            </UITable.Cell>
            <UITable.Cell className='hidden lg:table-cell'>
              {taskRolesLabel(row.roles)}
            </UITable.Cell>
            <UITable.Cell>
              <TaskStatusBadge status={row.status} />
            </UITable.Cell>
            <UITable.Cell className='hidden md:table-cell'>
              <TaskTimerBadge
                compact
                view={getTaskTimerView(row.status, row.timer, now)}
              />
            </UITable.Cell>
            <UITable.Cell>
              <UIPriority priority={row.priority}>
                <span className='max-md:sr-only'>
                  {TASK_PRIORITY_LABELS[row.priority]}
                </span>
              </UIPriority>
            </UITable.Cell>
            <UITable.Cell className='hidden text-right tabular-nums md:table-cell'>
              <span
                className={
                  getTaskSpentSec(row.status, row.timer, now) >
                  row.sp * SP_SECONDS
                    ? 'font-semibold text-destructive'
                    : undefined
                }
              >
                {formatNumber(row.sp)}
              </span>
            </UITable.Cell>
            <UITable.Cell className='hidden text-muted-foreground lg:table-cell'>
              {formatShortDate(row.createdAt, timeZone)}
            </UITable.Cell>
          </UITable.Row>
        ))}
      </UITable.Body>
    </UITable>
  );
}
