import { useSyncExternalStore } from 'react';

import type { ReadableStore } from './create-store';

/**
 * Подписка компонента на внешний стор.
 * `useSyncExternalStore` гарантирует один снапшот на весь рендер (без tearing).
 */
export function useStore<S>(store: ReadableStore<S>): S {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
