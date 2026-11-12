import { type BoardRole, TASK_STATUSES, type TaskStatus } from './enums.js';

export type BoardAction =
  | 'members.manage'
  | 'task.create'
  | 'task.edit'
  | 'task.lock'
  | 'task.pause'
  | 'task.comment'
  | 'task.link';

export type StatusMoveError =
  'ROLE_FORBIDDEN' | 'STATUS_MOVE_FORBIDDEN' | 'TASK_TAKE_LOCKED';

export interface MoveActor {
  id: string;
  role: BoardRole;
}

export interface MoveTask {
  status: TaskStatus;
  isTakeLocked: boolean;
  reviewerId: string;
  testerId: string | null;
}

const WORKER_ACTIONS: ReadonlySet<BoardAction> = new Set<BoardAction>([
  'task.create',
  'task.pause',
  'task.comment',
  'task.link',
]);

export function can(role: BoardRole, action: BoardAction): boolean {
  return role === 'admin' || (role === 'worker' && WORKER_ACTIONS.has(action));
}

export function statusMoveError(
  actor: MoveActor,
  task: MoveTask,
  to: TaskStatus,
): StatusMoveError | null {
  if (actor.role === 'guest') return 'ROLE_FORBIDDEN';
  if (actor.role === 'admin' || to === task.status) return null;
  if (task.status === 'todo' && task.isTakeLocked) return 'TASK_TAKE_LOCKED';
  if (TASK_STATUSES.indexOf(to) > TASK_STATUSES.indexOf(task.status))
    return null;

  const reviewerReturns =
    task.status === 'review' && actor.id === task.reviewerId && to === 'work';
  const testerReturns =
    task.status === 'test' &&
    actor.id === task.testerId &&
    (to === 'review' || to === 'work');
  return reviewerReturns || testerReturns ? null : 'STATUS_MOVE_FORBIDDEN';
}

export function allowedStatuses(
  actor: MoveActor,
  task: MoveTask,
): TaskStatus[] {
  return TASK_STATUSES.filter(
    (status) =>
      status === task.status || statusMoveError(actor, task, status) === null,
  );
}

/** Статус, в котором роль может создать задачу: рабочий только в `todo`, администратор в любом. */
export function createStatusError(
  role: BoardRole,
  status: TaskStatus,
): StatusMoveError | null {
  if (!can(role, 'task.create')) return 'ROLE_FORBIDDEN';
  return role === 'admin' || status === 'todo' ? null : 'STATUS_MOVE_FORBIDDEN';
}
