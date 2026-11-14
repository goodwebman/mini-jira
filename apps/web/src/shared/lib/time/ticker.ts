import type { ReadableStore } from '../store';

export interface Ticker extends ReadableStore<number> {
  /** Сколько компонентов сейчас подписано. Для тестов и отладки. */
  readonly size: () => number;
}

interface TickerOptions {
  readonly intervalMs: number;
  readonly now?: () => number;
  readonly onVisible?: (listener: () => void) => () => void;
}

/**
 * Общие часы для всех таймеров на экране: один `setInterval` на 60 карточек
 * вместо шестидесяти. Интервал живёт, пока есть подписчики.
 */
export function createTicker({
  intervalMs,
  now = Date.now,
  onVisible,
}: TickerOptions): Ticker {
  const listeners = new Set<() => void>();
  let current = now();
  let timer: ReturnType<typeof setInterval> | undefined;
  let stopVisible: (() => void) | undefined;

  const tick = () => {
    current = now();
    for (const listener of [...listeners]) listener();
  };

  return {
    getSnapshot: () => current,
    size: () => listeners.size,
    subscribe: (listener) => {
      listeners.add(listener);
      if (listeners.size === 1) {
        current = now();
        timer = setInterval(tick, intervalMs);
        stopVisible = onVisible?.(tick);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        clearInterval(timer);
        timer = undefined;
        stopVisible?.();
        stopVisible = undefined;
      };
    },
  };
}

/** Фоновая вкладка троттлит интервалы: при возврате обновляем время сразу. */
export function onDocumentVisible(listener: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const handle = () => {
    if (document.visibilityState === 'visible') listener();
  };
  document.addEventListener('visibilitychange', handle);
  return () => {
    document.removeEventListener('visibilitychange', handle);
  };
}
