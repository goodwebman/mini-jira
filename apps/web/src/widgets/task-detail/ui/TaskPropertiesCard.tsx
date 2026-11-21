import type { TaskDetail } from '@gwmt/contracts';

import type { BoardPermissions } from '@/entities/board';
import {
  SP_SECONDS,
  TaskLockNotice,
  TaskTimerPanel,
  type TaskTimerView,
  getTaskSpentSec,
} from '@/entities/task';
import { TaskStatusField } from '@/features/task/change-status';
import { TaskPropertyEditors } from '@/features/task/edit-task';
import { TaskTakeLockToggle } from '@/features/task/take-lock';
import { TaskPauseButton } from '@/features/task/toggle-pause';
import { formatNumericDate } from '@/shared/lib/format';
import { UICard } from '@/shared/ui';

import { TaskPropertyRow } from './TaskPropertyRow';
import { TaskReadOnlyProperties } from './TaskReadOnlyProperties';

export interface ITaskPropertiesCardProps {
  readonly task: TaskDetail;
  readonly timer: TaskTimerView;
  readonly permissions: BoardPermissions;
  readonly currentUserId: string;
  readonly timeZone: string;
  readonly now: number;
}

/**
 * Панель свойств: таймер с паузой, запрет, статус и свойства. Что редактируемо,
 * решают права роли; сами поля и действия приходят из фич.
 */
export function TaskPropertiesCard({
  task,
  timer,
  permissions,
  currentUserId,
  timeZone,
  now,
}: ITaskPropertiesCardProps) {
  return (
    <UICard className='grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 w1920:grid-cols-[128px_minmax(0,1fr)]'>
      <div className='col-span-full'>
        <TaskTimerPanel
          timer={timer}
          action={
            permissions.canPauseTasks && (
              <TaskPauseButton
                taskKey={task.key}
                timer={timer}
                variant='full'
              />
            )
          }
        />
      </div>
      {permissions.canLockTasks && task.status === 'todo' && (
        <div className='col-span-full'>
          <TaskTakeLockToggle task={task} />
        </div>
      )}
      {!permissions.canLockTasks && task.isTakeLocked && (
        <div className='col-span-full'>
          <TaskLockNotice />
        </div>
      )}
      <TaskPropertyRow htmlFor='task-status' label='Статус'>
        <TaskStatusField
          id='task-status'
          task={task}
          actor={{ id: currentUserId, role: task.myRole }}
        />
      </TaskPropertyRow>
      {permissions.canEditTask ? (
        <TaskPropertyEditors
          task={task}
          overEstimate={
            getTaskSpentSec(task.status, task.timer, now) > task.sp * SP_SECONDS
          }
          renderRow={(row) => (
            <TaskPropertyRow htmlFor={row.id} label={row.label}>
              {row.control}
            </TaskPropertyRow>
          )}
        />
      ) : (
        <TaskReadOnlyProperties
          task={task}
          overEstimate={
            getTaskSpentSec(task.status, task.timer, now) > task.sp * SP_SECONDS
          }
        />
      )}
      <TaskPropertyRow label='Создана'>
        {formatNumericDate(task.createdAt, timeZone)}
      </TaskPropertyRow>
      <TaskPropertyRow label='Доска'>{task.board.name}</TaskPropertyRow>
    </UICard>
  );
}
