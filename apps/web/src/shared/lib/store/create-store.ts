/** Чтение внешнего стора: ровно то, что нужно `useSyncExternalStore`. */
export interface ReadableStore<S> {
  readonly getSnapshot: () => S;
  readonly subscribe: (listener: () => void) => () => void;
}

export interface WritableStore<S> extends ReadableStore<S> {
  /** Заменяет состояние. Подписчики не вызываются, если ссылка не изменилась. */
  readonly setState: (next: ((previous: S) => S) | S) => void;
}

/**
 * Минимальный внешний стор: иммутабельный снапшот и подписка.
 *
 * Тот же контракт лежит в основе Zustand и react-redux, поэтому отдельная
 * библиотека не нужна. Снапшот меняется только целиком, что совместимо
 * с React Compiler и не даёт tearing в concurrent-режиме.
 */
export function createStore<S>(initial: S): WritableStore<S> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setState: (next) => {
      const resolved =
        typeof next === 'function' ? (next as (previous: S) => S)(state) : next;
      if (Object.is(resolved, state)) return;
      state = resolved;
      // Копия: подписчик может отписаться прямо во время уведомления
      for (const listener of [...listeners]) listener();
    },
  };
}
