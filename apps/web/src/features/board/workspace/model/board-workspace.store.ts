import type { TaskStatus } from '@gwmt/contracts';

import {
  EMPTY_TASK_FILTERS,
  type TaskFilters,
  hasActiveTaskFilters,
} from '@/entities/task';
import {
  type Persistence,
  type ReadableStore,
  createStore,
} from '@/shared/lib/store';

/**
 * Рабочее пространство доски — cross-module scope.
 *
 * Канбан и задача делят выбранную колонку и подсветку открытой карточки.
 * Стор живёт внутри роутов доски, а фильтры восстанавливаются из хранилища
 * при создании нового стора.
 */
export interface BoardWorkspaceState {
  /** На телефоне видна одна колонка: какая. */
  readonly phoneColumn: TaskStatus;
  /** Последняя открытая задача: при возврате на доску её карточка выделена. */
  readonly focusedTaskKey: null | string;
  readonly filters: TaskFilters;
}

export interface BoardWorkspaceStore extends ReadableStore<BoardWorkspaceState> {
  readonly boardId: number;
  readonly selectPhoneColumn: (status: TaskStatus) => void;
  readonly focusTask: (taskKey: string) => void;
  readonly updateFilters: (patch: Partial<TaskFilters>) => void;
}

export const INITIAL_WORKSPACE: BoardWorkspaceState = {
  phoneColumn: 'work',
  focusedTaskKey: null,
  filters: EMPTY_TASK_FILTERS,
};

export function createBoardWorkspaceStore({
  boardId,
  filterPersistence,
}: {
  readonly boardId: number;
  readonly filterPersistence?: Persistence<TaskFilters>;
}): BoardWorkspaceStore {
  const store = createStore<BoardWorkspaceState>({
    ...INITIAL_WORKSPACE,
    filters: filterPersistence?.load() ?? INITIAL_WORKSPACE.filters,
  });

  const update = (patch: Partial<BoardWorkspaceState>) =>
    store.setState((state) => ({ ...state, ...patch }));

  return {
    boardId,
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    selectPhoneColumn: (phoneColumn) => update({ phoneColumn }),
    focusTask: (focusedTaskKey) => {
      if (store.getSnapshot().focusedTaskKey !== focusedTaskKey)
        update({ focusedTaskKey });
    },
    updateFilters: (patch) => {
      const filters = { ...store.getSnapshot().filters, ...patch };
      // Поиск из одних пробелов ничего не отбирает: хранить нечего
      if (hasActiveTaskFilters(filters)) filterPersistence?.save(filters);
      else filterPersistence?.clear();
      update({ filters });
    },
  };
}
