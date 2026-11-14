import { createDi } from '@/shared/lib/di';
import { useStore } from '@/shared/lib/store';

import type {
  BoardWorkspaceState,
  BoardWorkspaceStore,
} from './board-workspace.store';

export const {
  Injector: BoardWorkspaceInjector,
  useDi: useBoardWorkspaceStore,
} = createDi<BoardWorkspaceStore>('BoardWorkspace');

export type BoardWorkspace = BoardWorkspaceState &
  Omit<BoardWorkspaceStore, 'getSnapshot' | 'subscribe'>;

/**
 * Плоский объект для компонентов: состояние и экшены.
 * Компонент не знает про подписку — только про данные и методы.
 */
export function useBoardWorkspace(): BoardWorkspace {
  const store = useBoardWorkspaceStore();
  const state = useStore(store);
  return {
    ...state,
    boardId: store.boardId,
    setQuery: store.setQuery,
    setPriority: store.setPriority,
    toggleAssignee: store.toggleAssignee,
    clearAssignees: store.clearAssignees,
    resetFilters: store.resetFilters,
    selectPhoneColumn: store.selectPhoneColumn,
    focusTask: store.focusTask,
  };
}
