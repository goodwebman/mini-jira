/** Тесткейсы: один интервал на всех подписчиков; остановка после последней отписки; время обновляется по тику и при возврате на вкладку; при подписке снапшот свежий. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTicker } from './ticker';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-06T09:00:00.000Z'));
});
afterEach(() => vi.useRealTimers());

describe('createTicker', () => {
  it('один интервал на всех и остановка после последней отписки', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const ticker = createTicker({ intervalMs: 1000 });
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = ticker.subscribe(first);
    const offSecond = ticker.subscribe(second);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(ticker.getSnapshot()).toBe(Date.now());

    offFirst();
    offSecond();
    expect(ticker.size()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('при первой подписке время свежее, а не со старта модуля', () => {
    const ticker = createTicker({ intervalMs: 1000 });
    vi.advanceTimersByTime(60_000);
    ticker.subscribe(() => {});
    expect(ticker.getSnapshot()).toBe(Date.now());
  });

  it('тикает сразу при возврате на вкладку', () => {
    let visible: (() => void) | undefined;
    const stop = vi.fn();
    const ticker = createTicker({
      intervalMs: 30_000,
      onVisible: (listener) => {
        visible = listener;
        return stop;
      },
    });
    const listener = vi.fn();
    const off = ticker.subscribe(listener);
    visible?.();
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
