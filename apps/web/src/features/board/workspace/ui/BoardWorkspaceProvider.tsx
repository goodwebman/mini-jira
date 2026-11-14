import { type ReactNode, useState } from 'react';

import { BoardWorkspaceInjector } from '../model/board-workspace.di';
import type { BoardWorkspaceStore } from '../model/board-workspace.store';

export interface IBoardWorkspaceProviderProps {
  /**
   * Фабрика стора. Провайдер не знает, откуда берутся зависимости (id доски
   * из адреса) — их собирает роут на границе модуля, тест подставляет свой стор.
   */
  readonly createStore: () => BoardWorkspaceStore;
  readonly children?: ReactNode;
}

/**
 * Стор создаётся один раз при монтировании и живёт, пока пользователь внутри
 * роутов доски. Смена доски — новый `key` у провайдера и новый стор.
 */
export function BoardWorkspaceProvider({
  createStore,
  children,
}: IBoardWorkspaceProviderProps) {
  const [store] = useState(createStore);
  return (
    <BoardWorkspaceInjector value={store}>{children}</BoardWorkspaceInjector>
  );
}
