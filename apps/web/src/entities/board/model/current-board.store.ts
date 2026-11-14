import {
  type Persistence,
  type ReadableStore,
  createStore,
} from '@/shared/lib/store';

/**
 * «Текущая доска» — последняя открытая. Global scope: от неё зависят модули,
 * не связанные друг с другом — сводка в меню, KPI по умолчанию, доска новой
 * задачи на «Моих задачах». Живёт, пока жива сессия пользователя.
 */
export interface CurrentBoardStore extends ReadableStore<null | number> {
  readonly remember: (boardId: number) => void;
  /** Доска пропала или доступ отозван: сводка вернётся к выбору сервера. */
  readonly forget: () => void;
}

export function createCurrentBoardStore({
  persistence,
}: {
  readonly persistence: Persistence<number>;
}): CurrentBoardStore {
  const store = createStore<null | number>(persistence.load());
  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    remember: (boardId) => {
      if (store.getSnapshot() === boardId) return;
      store.setState(boardId);
      persistence.save(boardId);
    },
    forget: () => {
      store.setState(null);
      persistence.clear();
    },
  };
}

export function parseStoredBoardId(raw: unknown): null | number {
  return typeof raw === 'number' && Number.isInteger(raw) && raw > 0
    ? raw
    : null;
}
