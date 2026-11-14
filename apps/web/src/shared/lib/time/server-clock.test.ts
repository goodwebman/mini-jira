/**
 * Тесткейсы: поправка считается в момент ответа; шум меньше секунды не будит подписчиков;
 * мусор вместо времени игнорируется; syncServerClock возвращает ответ как есть.
 */
import { describe, expect, it, vi } from 'vitest';

import { createServerClock, syncServerClock } from './server-clock';

describe('createServerClock', () => {
  it('поправка — разница времени сервера и клиента в момент ответа', () => {
    const clock = createServerClock(() =>
      Date.parse('2026-11-06T09:00:00.000Z'),
    );
    clock.sync('2026-11-06T09:00:30.000Z');
    expect(clock.offset.getSnapshot()).toBe(30_000);
  });

  it('расхождение меньше секунды и мусор подписчиков не будят', () => {
    let now = Date.parse('2026-11-06T09:00:00.000Z');
    const clock = createServerClock(() => now);
    clock.sync('2026-11-06T09:00:10.000Z');
    const listener = vi.fn();
    clock.offset.subscribe(listener);
    now += 60_000;
    clock.sync('2026-11-06T09:01:10.400Z');
    clock.sync('не время');
    expect(listener).not.toHaveBeenCalled();
    expect(clock.offset.getSnapshot()).toBe(10_000);
  });

  it('syncServerClock пропускает ответ дальше без изменений', () => {
    const response = { serverTime: '2026-11-06T09:00:00.000Z', items: [] };
    expect(syncServerClock(response)).toBe(response);
  });
});
