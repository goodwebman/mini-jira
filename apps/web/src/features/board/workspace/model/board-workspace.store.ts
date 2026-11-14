import type { TaskPriority, TaskStatus } from '@gwmt/contracts';

import { EMPTY_TASK_FILTERS, type TaskFilters } from '@/entities/task';
import { type ReadableStore, createStore } from '@/shared/lib/store';

/**
 * Рабочее пространство доски — cross-module scope.
 *
 * Им пользуются три модуля одной доски: канбан, участники и задача. Фильтры
 * переживают переходы «доска → задача → назад» и «доска → участники → назад»,
 * открытая задача подсвечивается при возврате. Стор живёт ровно столько, сколько
 * пользователь внутри роутов доски: ушёл в KPI или на другую доску — стор собран GC,
 * следующий пользователь на этом компьютере чужих фильтров не увидит.
 */
export interface BoardWorkspaceState {
  readonly filters: TaskFilters;
  /** На телефоне видна одна колонка: какая. */
  readonly phoneColumn: TaskStatus;
  /** Последняя открытая задача: при возврате на доску её карточка выделена. */
  readonly focusedTaskKey: null | string;
}

export interface BoardWorkspaceStore extends ReadableStore<BoardWorkspaceState> {
  readonly boardId: number;
  readonly setQuery: (query: string) => void;
  readonly setPriority: (priority: 'all' | TaskPriority) => void;
  readonly toggleAssignee: (userId: string) => void;
  readonly clearAssignees: () => void;
  readonly resetFilters: () => void;
  readonly selectPhoneColumn: (status: TaskStatus) => void;
  readonly focusTask: (taskKey: string) => void;
}

export const INITIAL_WORKSPACE: BoardWorkspaceState = {
  filters: EMPTY_TASK_FILTERS,
  phoneColumn: 'work',
  focusedTaskKey: null,
};

export function createBoardWorkspaceStore({
  boardId,
}: {
  readonly boardId: number;
}): BoardWorkspaceStore {
  const store = createStore<BoardWorkspaceState>(INITIAL_WORKSPACE);

  const update = (patch: Partial<BoardWorkspaceState>) =>
    store.setState((state) => ({ ...state, ...patch }));
  const updateFilters = (patch: Partial<TaskFilters>) =>
    update({ filters: { ...store.getSnapshot().filters, ...patch } });

  return {
    boardId,
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    setQuery: (query) => updateFilters({ query }),
    setPriority: (priority) => updateFilters({ priority }),
    toggleAssignee: (userId) => {
      const { assigneeIds } = store.getSnapshot().filters;
      updateFilters({
        assigneeIds: assigneeIds.includes(userId)
          ? assigneeIds.filter((id) => id !== userId)
          : [...assigneeIds, userId],
      });
    },
    clearAssignees: () => updateFilters({ assigneeIds: [] }),
    resetFilters: () => update({ filters: EMPTY_TASK_FILTERS }),
    selectPhoneColumn: (phoneColumn) => update({ phoneColumn }),
    focusTask: (focusedTaskKey) => {
      if (store.getSnapshot().focusedTaskKey !== focusedTaskKey)
        update({ focusedTaskKey });
    },
  };
}

/**
 * Фильтр по людям, которых на доске уже нельзя выбрать: удалили, сделали гостем,
 * убрал другой администратор. Такой человек не должен остаться невидимым фильтром,
 * поэтому в работу идёт пересечение с текущими участниками — вычисляется, а не
 * синхронизируется событиями.
 */
export function effectiveFilters(
  filters: TaskFilters,
  assignableIds: readonly string[],
): TaskFilters {
  const assigneeIds = filters.assigneeIds.filter((id) =>
    assignableIds.includes(id),
  );
  return assigneeIds.length === filters.assigneeIds.length
    ? filters
    : { ...filters, assigneeIds };
}
