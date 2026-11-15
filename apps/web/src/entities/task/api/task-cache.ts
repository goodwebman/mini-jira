import type {
  BoardTasksResponse,
  TaskCard,
  TaskComment,
  TaskDetail,
  TaskStatus,
} from '@gwmt/contracts';
import type { QueryClient } from '@tanstack/react-query';

import { getTaskSpentSec } from '../model/task-time';
import { taskQueryKeys } from './taskQueries';

/**
 * Точечные правки кэша задач. Мутации отвечают карточкой `TaskCard`: её кладём
 * в доску и в деталь, не дожидаясь перезапроса.
 */
export function putTaskCardInCache(client: QueryClient, card: TaskCard): void {
  client.setQueryData<BoardTasksResponse>(
    taskQueryKeys.board(card.boardId),
    (data) => {
      if (!data) return data;
      if (data.items.some((item) => item.key === card.key))
        return {
          ...data,
          items: data.items.map((item) =>
            item.key === card.key ? card : item,
          ),
        };
      // Доска показывает только активный спринт: задача закрытого спринта туда не попадает
      return card.sprintId === data.sprint.id
        ? { ...data, items: [...data.items, card] }
        : data;
    },
  );
  client.setQueryData<TaskDetail>(
    taskQueryKeys.detail(card.key),
    (detail) => detail && { ...detail, ...card },
  );
}

/** Ответ сервера на комментарий дописывается в деталь задачи без перезапроса. */
export async function appendTaskComment(
  client: QueryClient,
  taskKey: string,
  comment: TaskComment,
): Promise<void> {
  const queryKey = taskQueryKeys.detail(taskKey);
  // Старый ответ детали не должен затереть уже сохранённый комментарий.
  await client.cancelQueries({ queryKey, exact: true });
  client.setQueryData<TaskDetail>(
    queryKey,
    (detail) =>
      detail && { ...detail, comments: [...detail.comments, comment] },
  );
}

/** Что нужно, чтобы откатить один оптимистичный перенос. */
export interface TaskMoveSnapshot {
  readonly boardId: number;
  readonly key: string;
  readonly previous: TaskCard | undefined;
  /** Метка оптимистичной записи: откат не трогает карточку, если её уже изменил следующий ход. */
  readonly movedAt: string;
}

/**
 * Оптимистичный перенос карточки: колонка меняется сразу, таймер стартует заново.
 * Летящий запрос доски отменяется, иначе старый ответ перетёр бы перенос.
 */
export async function moveTaskInBoardCache(
  client: QueryClient,
  boardId: number,
  key: string,
  status: TaskStatus,
  nowIso: string,
): Promise<TaskMoveSnapshot> {
  const queryKey = taskQueryKeys.board(boardId);
  await client.cancelQueries({ queryKey });
  const previous = client
    .getQueryData<BoardTasksResponse>(queryKey)
    ?.items.find((item) => item.key === key);
  client.setQueryData<BoardTasksResponse>(
    queryKey,
    (current) =>
      current && {
        ...current,
        items: current.items.map((item) =>
          item.key === key && item.status !== status
            ? {
                ...item,
                status,
                isTakeLocked: status === 'todo' && item.isTakeLocked,
                timer: {
                  ...item.timer,
                  spentSec: getTaskSpentSec(
                    item.status,
                    item.timer,
                    Date.parse(nowIso),
                  ),
                  statusEnteredAt: nowIso,
                  pausedAt: null,
                  pausedTotalSec: 0,
                  canPause: status !== 'todo' && status !== 'done',
                  completedInDays: null,
                },
              }
            : item,
        ),
      },
  );
  return { boardId, key, previous, movedAt: nowIso };
}

/**
 * Откат одной карточки. Соседние оптимистичные переносы остаются на месте;
 * если эту же карточку уже перенесли ещё раз, откат её не трогает.
 */
export function restoreTaskMove(
  client: QueryClient,
  snapshot: TaskMoveSnapshot,
): void {
  const { previous } = snapshot;
  if (!previous) return;
  client.setQueryData<BoardTasksResponse>(
    taskQueryKeys.board(snapshot.boardId),
    (data) =>
      data && {
        ...data,
        items: data.items.map((item) =>
          item.key === snapshot.key &&
          item.timer.statusEnteredAt === snapshot.movedAt
            ? previous
            : item,
        ),
      },
  );
}
