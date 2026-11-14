import {
  type BoardRole,
  type CreateTaskBody,
  type TaskPriority,
  type TaskStatus,
  createTaskBodySchema,
} from '@gwmt/contracts';

import { parseSp } from '@/entities/task';
import { type FieldErrors, issuesToFieldErrors } from '@/shared/lib/form';

/** Черновик формы: всё строками, как в полях ввода. Пустая строка — «не выбрано». */
export interface TaskDraft {
  readonly title: string;
  readonly description: string;
  readonly boardId: null | number;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly sp: string;
  readonly authorId: string;
  readonly reviewerId: string;
  readonly testerId: string;
  readonly designerId: string;
}

export type TaskDraftField = keyof TaskDraft;

export function createTaskDraft({
  boardId,
  status = 'todo',
}: {
  readonly boardId: null | number;
  readonly status?: TaskStatus;
}): TaskDraft {
  return {
    title: '',
    description: '',
    boardId,
    status,
    priority: 'med',
    sp: '',
    authorId: '',
    reviewerId: '',
    testerId: '',
    designerId: '',
  };
}

/**
 * Доска формы. Предложенная (текущая) доска годится, только если на ней можно
 * создавать задачи: на гостевой доске сервер ответит 403, а нативный select
 * показал бы другую доску, чем та, куда уйдёт запрос. Пока список грузится,
 * держим предложенную.
 */
export function resolveDraftBoardId(
  proposed: null | number,
  writableIds: readonly number[] | undefined,
): null | number {
  if (!writableIds) return proposed;
  if (proposed !== null && writableIds.includes(proposed)) return proposed;
  return writableIds[0] ?? null;
}

/** Автор по умолчанию — сам пользователь, если его можно назначить на этой доске. */
export function defaultAuthorId(
  assignableIds: readonly string[],
  currentUserId: string,
): string {
  return assignableIds.includes(currentUserId)
    ? currentUserId
    : (assignableIds[0] ?? '');
}

/**
 * Другая доска — другие участники. Люди, которых на новой доске нет,
 * сбрасываются: иначе сервер ответит ASSIGNEE_IS_GUEST или NOT_BOARD_MEMBER.
 */
export function changeDraftBoard(
  draft: TaskDraft,
  boardId: number,
  assignableIds: readonly string[],
): TaskDraft {
  const keep = (id: string) => (assignableIds.includes(id) ? id : '');
  return {
    ...draft,
    boardId,
    authorId: keep(draft.authorId),
    reviewerId: keep(draft.reviewerId),
    testerId: keep(draft.testerId),
    designerId: keep(draft.designerId),
  };
}

export type TaskDraftResult =
  | { readonly ok: false; readonly errors: FieldErrors<TaskDraftField> }
  | {
      readonly ok: true;
      readonly boardId: number;
      readonly body: CreateTaskBody;
    };

/**
 * Проверка той же схемой, что на сервере. Рабочий создаёт только в «К работе»:
 * статус из черновика ему не отправляется, даже если кто-то подменил форму.
 */
export function validateTaskDraft(
  draft: TaskDraft,
  role: BoardRole,
): TaskDraftResult {
  const parsed = createTaskBodySchema.safeParse({
    title: draft.title,
    description: draft.description.trim() || undefined,
    status: role === 'admin' ? draft.status : 'todo',
    priority: draft.priority,
    sp: parseSp(draft.sp) ?? Number.NaN,
    authorId: draft.authorId,
    reviewerId: draft.reviewerId,
    testerId: draft.testerId || null,
    designerId: draft.designerId || null,
  });
  const errors: FieldErrors<TaskDraftField> = parsed.success
    ? {}
    : issuesToFieldErrors(parsed.error.issues);
  if (draft.boardId === null) errors.boardId = 'Выберите доску';
  if (!parsed.success || draft.boardId === null) return { ok: false, errors };
  return { ok: true, boardId: draft.boardId, body: parsed.data };
}
