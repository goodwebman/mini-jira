/** Тесткейсы: русские формы 1/2/5/11/21/дробные; числа и SP с запятой, -0; разбор десятичных; даты без сдвига UTC; период в одном и разных месяцах; пояса; длительности на границах минут/часов/дней. */
import { describe, expect, it } from 'vitest';

import {
  countLabel,
  formatDateRange,
  formatDayMonth,
  formatDuration,
  formatLongDate,
  formatNumber,
  formatNumericDate,
  formatShortDate,
  formatShortDateTime,
  formatSp,
  parseDecimal,
  percentOf,
  pluralRu,
} from './index';

const TASK = ['задача', 'задачи', 'задач'] as const;

describe('pluralRu', () => {
  it.each([
    [1, 'задача'],
    [2, 'задачи'],
    [4, 'задачи'],
    [5, 'задач'],
    [11, 'задач'],
    [14, 'задач'],
    [21, 'задача'],
    [22, 'задачи'],
    [100, 'задач'],
    [111, 'задач'],
    [0, 'задач'],
    [1.5, 'задачи'],
  ])('%d → %s', (count, expected) => {
    expect(pluralRu(count, TASK)).toBe(expected);
  });

  it('countLabel склеивает число и форму', () => {
    expect(countLabel(3, ['доска', 'доски', 'досок'])).toBe('3 доски');
  });
});

describe('числа', () => {
  it('один знак после запятой без хвостовых нулей', () => {
    expect(formatNumber(3)).toBe('3');
    expect(formatNumber(2.25)).toBe('2,3');
    expect(formatNumber(-0.01)).toBe('0');
    expect(formatSp(2.5)).toBe('2,5 SP');
  });

  it('процент от пустого целого — 0', () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(5, 0)).toBe(0);
  });

  it.each([
    ['3', 3],
    ['2,5', 2.5],
    [' 0.5 ', 0.5],
    ['', null],
    ['abc', null],
    ['1,2,3', null],
    ['1e3', null],
  ])('parseDecimal(%j) → %j', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });
});

describe('даты', () => {
  it('календарная дата не сдвигается часовым поясом', () => {
    expect(formatDayMonth('2026-11-02')).toBe('2 ноя');
    expect(formatDayMonth('2026-05-31')).toBe('31 мая');
  });

  it('период спринта', () => {
    expect(formatDateRange('2026-11-02', '2026-11-13')).toBe('2–13 ноя');
    expect(formatDateRange('2026-10-27', '2026-11-07')).toBe('27 окт – 7 ноя');
    expect(formatDateRange('2025-12-29', '2026-01-09')).toBe('29 дек – 9 янв');
  });

  it('момент времени в поясе пользователя', () => {
    const iso = '2026-11-07T22:30:00.000Z';
    expect(formatShortDate(iso, 'Europe/Moscow')).toBe('8 ноя');
    expect(formatShortDate(iso, 'UTC')).toBe('7 ноя');
    expect(formatNumericDate(iso, 'Asia/Novosibirsk')).toBe('08.11.2026');
    expect(formatShortDateTime(iso, 'Europe/Moscow')).toBe('8 ноя, 01:30');
    expect(formatLongDate(iso, 'Europe/Moscow')).toBe('8 ноября 2026');
  });
});

describe('formatDuration', () => {
  it.each([
    [-5, 'меньше минуты'],
    [0.5, 'меньше минуты'],
    [1, '1 мин'],
    [59, '59 мин'],
    [60, '1 ч'],
    [61, '1 ч 1 мин'],
    [1439, '23 ч 59 мин'],
    [1440, '1 д'],
    [1440 + 120, '1 д 2 ч'],
    [1440 * 3 + 59, '3 д'],
  ])('%d мин → %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});
