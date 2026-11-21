import type { MoveActor, TaskCard, TaskStatus } from '@gwmt/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  moveTaskInBoardCache,
  putTaskCardInCache,
  restoreTaskMove,
  taskMoveError,
  updateTask,
} from '@/entities/task';
import { QUERY_TAGS, invalidateTags } from '@/shared/api';
import { getServerClockOffset } from '@/shared/lib/time';
import { useToast } from '@/shared/ui';

type MovableTask = Pick<
  TaskCard,
  'boardId' | 'isTakeLocked' | 'key' | 'people' | 'status'
>;

export const TASK_STATUS_MUTATION_KEY = ['task', 'change-status'] as const;

/**
 * Смена статуса: перетаскивание на доске и селект на странице задачи.
 *
 * Права проверяются до запроса теми же правилами, что и на сервере, поэтому
 * запрещённый ход не уходит в сеть и не мигает карточкой. Разрешённый ход
 * применяется оптимистично; при отказе сервера откатывается только эта карточка.
 * Перезапрос — после последнего хода серии: промежуточный ответ вернул бы
 * ещё летящие переносы на старые места.
 */
export function useChangeTaskStatus(actor: MoveActor) {
  const client = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationKey: TASK_STATUS_MUTATION_KEY,
    mutationFn: ({ task, status }: { task: MovableTask; status: TaskStatus }) =>
      updateTask(task.key, { status }),
    onMutate: ({ task, status }) =>
      moveTaskInBoardCache(
        client,
        task.boardId,
        task.key,
        status,
        new Date(Date.now() + getServerClockOffset()).toISOString(),
      ),
    onError: (_error, _variables, snapshot) => {
      if (snapshot) restoreTaskMove(client, snapshot);
    },
    onSuccess: (card) => putTaskCardInCache(client, card),
    // Блокеры соседних задач, «Мои задачи», сводка и KPI зависят от статуса
    onSettled: () =>
      client.isMutating({ mutationKey: TASK_STATUS_MUTATION_KEY }) === 1
        ? invalidateTags(client, [QUERY_TAGS.tasks])
        : undefined,
  });

  const moveError = (task: MovableTask, to: TaskStatus): null | string =>
    task.status === to ? null : taskMoveError(actor, task, to);

  /** `true`, если ход ушёл на сервер. Запрет объясняется тостом. */
  const changeStatus = (task: MovableTask, to: TaskStatus): boolean => {
    if (task.status === to) return false;
    const error = moveError(task, to);
    if (error) {
      toast(error);
      return false;
    }
    mutation.mutate({ task, status: to });
    return true;
  };

  return {
    changeStatus,
    canMove: (task: MovableTask, to: TaskStatus) =>
      moveError(task, to) === null,
    pendingStatus: mutation.isPending ? mutation.variables.status : null,
  };
}
