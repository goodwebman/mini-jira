import type { ReactNode } from 'react';

import type { TaskCard as TaskCardData } from '@gwmt/contracts';

import { formatSp } from '@/shared/lib/format';
import { type IUITaskCardProps, UITaskCard } from '@/shared/ui';

import { TASK_PRIORITY_LABELS } from '../model/task-meta';
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
}

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
  ...props
}: ITaskCardProps) {
  return (
    <UITaskCard
      taskKey={task.key}
      title={task.title}
      points={formatSp(task.sp)}
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
