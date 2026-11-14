import type { MoveActor, TaskCard } from '@gwmt/contracts';

import {
  TaskStatusBadge,
  TaskStatusSelect,
  taskAllowedStatuses,
} from '@/entities/task';

import { useChangeTaskStatus } from '../model/use-change-task-status';

/**
 * Статус на странице задачи: селект с разрешёнными переходами или бейдж,
 * если двигать некуда (гость, чужой этап). Это же — доступная с клавиатуры
 * альтернатива перетаскиванию.
 */
export function TaskStatusField({
  task,
  actor,
  id,
}: {
  readonly task: Pick<
    TaskCard,
    'boardId' | 'isTakeLocked' | 'key' | 'people' | 'status'
  >;
  readonly actor: MoveActor;
  readonly id?: string;
}) {
  const { changeStatus, pendingStatus } = useChangeTaskStatus(actor);
  const allowed = taskAllowedStatuses(actor, task);

  if (allowed.length <= 1) return <TaskStatusBadge status={task.status} />;

  return (
    <TaskStatusSelect
      id={id}
      value={pendingStatus ?? task.status}
      statuses={allowed}
      disabled={pendingStatus !== null}
      onValueChange={(status) => changeStatus(task, status)}
    />
  );
}
