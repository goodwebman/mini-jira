import type { Provider } from 'react';

import { createStrictContext } from './create-strict-context';
import { useStrictContext } from './use-strict-context';

export interface Di<T> {
  /** Провайдер зависимости: `<Injector value={service}>`. */
  readonly Injector: Provider<null | T>;
  /** Достаёт зависимость; без провайдера бросает ошибку. */
  readonly useDi: () => T;
}

/**
 * DI-токен: пара «провайдер + хук» для одной зависимости.
 *
 * Где создать экземпляр, решает скоуп:
 * - global — один раз на приложение или сессию, провайдер в `app`;
 * - cross-module — на границе группы роутов, провайдер в `element` роута с `<Outlet />`;
 * - module — внутри страницы через `useState(() => create…())`, токен не нужен.
 *
 * @example
 * export const { Injector: BoardWorkspaceInjector, useDi: useBoardWorkspaceStore } =
 *   createDi<BoardWorkspaceStore>('BoardWorkspace');
 */
export function createDi<T>(name: string): Di<T> {
  const context = createStrictContext<T>(name);
  return {
    Injector: context.Provider,
    useDi: () => useStrictContext(context),
  };
}
