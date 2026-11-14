import { useEffect } from 'react';

import { createDi } from '@/shared/lib/di';
import { useStore } from '@/shared/lib/store';

import type { CurrentBoardStore } from './current-board.store';

export const { Injector: CurrentBoardInjector, useDi: useCurrentBoardStore } =
  createDi<CurrentBoardStore>('CurrentBoard');

/** id последней открытой доски или `null`, если пользователь ещё не открывал доски. */
export function useCurrentBoardId(): null | number {
  return useStore(useCurrentBoardStore());
}

/** Открытая доска становится текущей: по ней строятся сводка меню и KPI по умолчанию. */
export function useRememberCurrentBoard(boardId: number): void {
  const store = useCurrentBoardStore();
  useEffect(() => {
    store.remember(boardId);
  }, [store, boardId]);
}
