import type { ReactNode } from 'react';

import type { TaskCard as TaskCardData } from '@gwmt/contracts';

import { cn } from '@/shared/lib/cn';
import { formatSp } from '@/shared/lib/format';
import { type IUITaskCardProps, UITaskCard } from '@/shared/ui';

import { TASK_PRIORITY_LABELS } from '../model/task-meta';
import { SP_SECONDS, getTaskSpentSec } from '../model/task-time';
import type { TaskTimerView } from '../model/task-timer';
import { TaskBlockerMark } from './TaskBlockerMark';
import { TaskLinksCount } from './TaskLinksCount';
import { TaskLockBadge } from './TaskLockBadge';
import { TaskTimerBadge } from './TaskTimerBadge';

export interface ITaskCardProps extends Omit<
  IUITaskCardProps,
  | 'badges'
  | 'meta'
  | 'points'
  | 'priority'
  | 'priorityLabel'
  | 'taskKey'
  | 'title'
> {
  readonly task: TaskCardData;
  readonly timer: TaskTimerView;
  /** Дата создания, уже отформатированная в поясе доски. */
  readonly createdLabel: string;
  /** Кнопка паузы: её добавляет фича, если у пользователя есть право. */
  readonly timerAction?: ReactNode;
  /** Аватары людей задачи — их собирает слой выше из сущности пользователя. */
  readonly people?: ReactNode;
  readonly now: number;
}

const statusBorder = {
  todo: 'border-s-status-todo',
  work: 'border-s-status-work',
  review: 'border-s-status-review',
  test: 'border-s-status-test',
  done: 'border-s-status-done',
} satisfies Record<TaskCardData['status'], string>;

/**
 * Карточка задачи на доске. Только данные задачи: действия и люди приходят
 * слотами (IoC), поэтому карточка не знает ни про права, ни про мутации.
 */
export function TaskCard({
  task,
  timer,
  createdLabel,
  timerAction,
  people,
  now,
  className,
  ...props
}: ITaskCardProps) {
  return (
    <UITaskCard
      taskKey={task.key}
      title={task.title}
      className={cn(
        getTaskSpentSec(task.status, task.timer, now) > task.sp * SP_SECONDS &&
          'border-destructive/50 bg-destructive-tint/30',
        'border-s-2',
        statusBorder[task.status],
        className,
      )}
      points={
        <span
          className={
            getTaskSpentSec(task.status, task.timer, now) > task.sp * SP_SECONDS
              ? 'font-semibold text-destructive'
              : undefined
          }
        >
          {formatSp(task.sp)}
        </span>
      }
      priority={task.priority}
      priorityLabel={TASK_PRIORITY_LABELS[task.priority]}
      badges={
        <>
          <TaskTimerBadge view={timer} />
          {task.isTakeLocked && <TaskLockBadge />}
          {timerAction}
        </>
      }
      meta={
        <>
          <span>{createdLabel}</span>
          <TaskLinksCount count={task.linkCount} />
          {task.isBlocked && <TaskBlockerMark />}
        </>
      }
      people={people}
      {...props}
    />
  );
}
