import {
  type BoardRole,
  type MoveActor,
  type MoveTask,
  type StatusMoveError,
  type TaskCard,
  type TaskStatus,
  allowedStatuses,
  createStatusError,
  statusMoveError,
} from '@gwmt/contracts';

/**
 * Правила переходов живут в `@gwmt/contracts` и те же самые проверяет сервер.
 * Здесь только адаптер карточки и человеческие тексты отказов.
 */
export function toMoveTask(
  task: Pick<TaskCard, 'isTakeLocked' | 'people' | 'status'>,
): MoveTask {
  return {
    status: task.status,
    isTakeLocked: task.isTakeLocked,
    authorId: task.people.author.id,
    reviewerId: task.people.reviewer.id,
    testerId: task.people.tester?.id ?? null,
    designerId: task.people.designer?.id ?? null,
  };
}

export const STATUS_MOVE_ERROR_TEXT: Record<StatusMoveError, string> = {
  ROLE_FORBIDDEN: 'Гость может только смотреть',
  STATUS_MOVE_FORBIDDEN:
    'Перемещение недоступно: задача не назначена вам или переход запрещён',
  TASK_TAKE_LOCKED: 'Администратор запретил брать эту задачу в работу',
};

/** Почему задачу нельзя перевести в статус; `null` — можно. */
export function taskMoveError(
  actor: MoveActor,
  task: Pick<TaskCard, 'isTakeLocked' | 'people' | 'status'>,
  to: TaskStatus,
): null | string {
  const code = statusMoveError(actor, toMoveTask(task), to);
  return code ? STATUS_MOVE_ERROR_TEXT[code] : null;
}

/** Статусы для селекта на странице задачи: текущий и разрешённые переходы, в порядке колонок доски. */
export function taskAllowedStatuses(
  actor: MoveActor,
  task: Pick<TaskCard, 'isTakeLocked' | 'people' | 'status'>,
): TaskStatus[] {
  return allowedStatuses(actor, toMoveTask(task));
}

/** Можно ли создать задачу сразу в этой колонке: рабочий — только «К работе». */
export function canCreateInStatus(
  role: BoardRole,
  status: TaskStatus,
): boolean {
  return createStatusError(role, status) === null;
}
