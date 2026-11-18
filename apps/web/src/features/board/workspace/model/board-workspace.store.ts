import type { TaskStatus } from '@gwmt/contracts';

import { type ReadableStore, createStore } from '@/shared/lib/store';

/**
 * Рабочее пространство доски — cross-module scope.
 *
 * Канбан и задача делят выбранную колонку и подсветку открытой карточки.
 * Фильтры хранятся в URL. Стор живёт ровно столько, сколько
 * пользователь внутри роутов доски: ушёл в KPI или на другую доску — стор собран GC,
 * следующий пользователь получает новое рабочее пространство.
 */
export interface BoardWorkspaceState {
  /** На телефоне видна одна колонка: какая. */
  readonly phoneColumn: TaskStatus;
  /** Последняя открытая задача: при возврате на доску её карточка выделена. */
  readonly focusedTaskKey: null | string;
}

export interface BoardWorkspaceStore extends ReadableStore<BoardWorkspaceState> {
  readonly boardId: number;
  readonly selectPhoneColumn: (status: TaskStatus) => void;
  readonly focusTask: (taskKey: string) => void;
}

export const INITIAL_WORKSPACE: BoardWorkspaceState = {
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

  return {
    boardId,
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    selectPhoneColumn: (phoneColumn) => update({ phoneColumn }),
    focusTask: (focusedTaskKey) => {
      if (store.getSnapshot().focusedTaskKey !== focusedTaskKey)
        update({ focusedTaskKey });
    },
  };
}
