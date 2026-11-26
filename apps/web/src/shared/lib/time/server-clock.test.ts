/**
 * Тесткейсы: поправка считается в момент ответа; шум меньше секунды не будит подписчиков;
 * мусор вместо времени игнорируется; syncServerClock двигает общие часы и возвращает ответ как есть;
 * компонент перерисовывается с новой поправкой.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  createServerClock,
  getServerClockOffset,
  syncServerClock,
  useServerClockOffset,
} from './server-clock';

/** Порог шума часов: точнее в тестах с настоящим `Date.now` не сравнить. */
const NOISE = 1000;
const shifted = (ms: number) => new Date(Date.now() + ms).toISOString();

describe('createServerClock', () => {
  it('поправка — разница времени сервера и клиента в момент ответа', () => {
    const clock = createServerClock(() =>
      Date.parse('2026-11-06T09:00:00.000Z'),
    );
    clock.sync('2026-11-06T09:00:30.000Z');
    expect(clock.getSnapshot()).toBe(30_000);
  });

  it('расхождение меньше секунды и мусор подписчиков не будят', () => {
    let now = Date.parse('2026-11-06T09:00:00.000Z');
    const clock = createServerClock(() => now);
    clock.sync('2026-11-06T09:00:10.000Z');
    const listener = vi.fn();
    clock.subscribe(listener);
    now += 60_000;
    clock.sync('2026-11-06T09:01:10.400Z');
    clock.sync('не время');
    expect(listener).not.toHaveBeenCalled();
    expect(clock.getSnapshot()).toBe(10_000);
  });

  it('наружу не отдаёт setState: поправку меняет только sync', () => {
    expect(createServerClock()).not.toHaveProperty('setState');
  });
});

describe('общие часы приложения', () => {
  it('syncServerClock двигает поправку и пропускает ответ дальше без изменений', () => {
    const response = { serverTime: shifted(60_000), items: [] };
    expect(syncServerClock(response)).toBe(response);
    // Между `shifted` и `sync` проходят миллисекунды, а не секунды
    expect(Math.abs(getServerClockOffset() - 60_000)).toBeLessThan(NOISE);
  });

  it('компонент перерисовывается с новой поправкой', () => {
    syncServerClock({ serverTime: shifted(0) });
    const { result } = renderHook(() => useServerClockOffset());
    expect(Math.abs(result.current)).toBeLessThan(NOISE);

    act(() => {
      syncServerClock({ serverTime: shifted(-120_000) });
    });
    expect(Math.abs(result.current + 120_000)).toBeLessThan(NOISE);
  });
});
