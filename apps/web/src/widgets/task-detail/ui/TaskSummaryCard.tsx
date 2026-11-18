import type { TaskDetail } from '@gwmt/contracts';

import {
  SP_SECONDS,
  TaskPriorityMark,
  TaskStatusBadge,
  getTaskSpentSec,
} from '@/entities/task';
import { CopyTaskLinkButton } from '@/features/task/copy-link';
import { DeleteTaskButton } from '@/features/task/delete-task';
import { EditTaskButton } from '@/features/task/edit-task';
import { formatSp } from '@/shared/lib/format';
import { UICard } from '@/shared/ui';

/** Шапка задачи: статус, приоритет, оценка, ссылка, название и описание. */
export function TaskSummaryCard({
  task,
  now,
  canEdit,
  canDelete,
  onDeleted,
}: {
  readonly task: TaskDetail;
  readonly now: number;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly onDeleted: () => void;
}) {
  const overEstimate =
    getTaskSpentSec(task.status, task.timer, now) > task.sp * SP_SECONDS;
  return (
    <UICard padding='lg' className='flex flex-col gap-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <TaskStatusBadge status={task.status} />
        <TaskPriorityMark priority={task.priority} withLabel />
        <span
          className={
            overEstimate
              ? 'rounded-tag bg-destructive-tint px-1 text-small font-semibold text-destructive'
              : 'text-small text-muted-foreground'
          }
          title={
            overEstimate ? 'Затраченное время превысило оценку' : undefined
          }
        >
          {formatSp(task.sp)}
        </span>
        <span className='ml-auto'>
          <CopyTaskLinkButton taskKey={task.key} />
        </span>
      </div>
      <h2 className='m-0 text-display font-semibold tracking-title wrap-anywhere'>
        {task.title}
      </h2>
      <p className='m-0 whitespace-pre-line wrap-anywhere'>
        {task.description || 'Описание не заполнено.'}
      </p>
      {(canEdit || canDelete) && (
        <div className='flex flex-wrap gap-2'>
          {canEdit && <EditTaskButton task={task} />}
          {canDelete && (
            <DeleteTaskButton
              boardId={task.boardId}
              taskKey={task.key}
              onDeleted={onDeleted}
            />
          )}
        </div>
      )}
    </UICard>
  );
}
