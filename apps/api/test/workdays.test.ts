import { describe, expect, it } from 'vitest';

import {
  addDays,
  countWorkdays,
  dateInZone,
  mondayOf,
  nextMondayAfterSprint,
  sprintEndDate,
  sprintWorkdays,
  startOfDayInZone,
  workingSeconds,
} from '../src/lib/workdays.js';

const MSK = 'Europe/Moscow';

describe('workdays', () => {
  it('понедельник недели', () => {
    expect(mondayOf('2026-11-08')).toBe('2026-11-02'); // воскресенье
    expect(mondayOf('2026-11-09')).toBe('2026-11-09'); // понедельник
    expect(mondayOf('2026-11-13')).toBe('2026-11-09'); // пятница
  });

  it('спринт: 10 рабочих дней, конец в пятницу второй недели', () => {
    const days = sprintWorkdays('2026-11-02');
    expect(days).toHaveLength(10);
    expect(days[4]).toBe('2026-11-06');
    expect(days[5]).toBe('2026-11-09');
    expect(days[9]).toBe('2026-11-13');
    expect(sprintEndDate('2026-11-02')).toBe('2026-11-13');
    expect(nextMondayAfterSprint('2026-11-13')).toBe('2026-11-16');
  });

  it('дата по поясу зависит от пояса', () => {
    const instant = new Date('2026-11-08T20:30:00.000Z');
    expect(dateInZone(instant, MSK)).toBe('2026-11-08');
    expect(dateInZone(instant, 'Asia/Novosibirsk')).toBe('2026-11-09');
  });

  it('начало дня по поясу', () => {
    expect(startOfDayInZone('2026-11-09', MSK).toISOString()).toBe(
      '2026-11-08T21:00:00.000Z',
    );
  });

  it('рабочие дни считаются включительно', () => {
    expect(countWorkdays('2026-11-09', '2026-11-09')).toBe(1);
    expect(countWorkdays('2026-11-06', '2026-11-09')).toBe(2); // пятница и понедельник
    expect(countWorkdays('2026-11-07', '2026-11-08')).toBe(0); // выходные
  });

  it('рабочее время не включает выходные', () => {
    const friday = new Date('2026-11-06T15:00:00.000Z'); // пт 18:00 МСК
    const monday = new Date('2026-11-09T06:00:00.000Z'); // пн 09:00 МСК
    expect(workingSeconds(friday, monday, MSK)).toBe(6 * 3600 + 9 * 3600);
  });

  it('addDays переходит через месяц', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });
});
