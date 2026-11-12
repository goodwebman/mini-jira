import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';

export type IsoDate = string;

const DAY_MS = 86_400_000;
export const SPRINT_LENGTH_DAYS = 14;
export const SPRINT_WORKDAYS = 10;

const toUtcMs = (date: IsoDate) => Date.parse(`${date}T00:00:00Z`);
const fromUtcMs = (ms: number): IsoDate =>
  new Date(ms).toISOString().slice(0, 10);

export const addDays = (date: IsoDate, days: number): IsoDate =>
  fromUtcMs(toUtcMs(date) + days * DAY_MS);

export const diffDays = (later: IsoDate, earlier: IsoDate): number =>
  Math.round((toUtcMs(later) - toUtcMs(earlier)) / DAY_MS);

/** 0 это воскресенье, как в Date. */
const dayOfWeek = (date: IsoDate) => new Date(toUtcMs(date)).getUTCDay();

export const isWorkday = (date: IsoDate) =>
  dayOfWeek(date) !== 0 && dayOfWeek(date) !== 6;

export const mondayOf = (date: IsoDate): IsoDate =>
  addDays(date, -((dayOfWeek(date) + 6) % 7));

export const dateInZone = (instant: Date, timezone: string): IsoDate =>
  format(new TZDate(instant.getTime(), timezone), 'yyyy-MM-dd');

export function startOfDayInZone(date: IsoDate, timezone: string): Date {
  const [year, month, day] = date.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(new TZDate(year, month - 1, day, timezone).getTime());
}

/** Пятница второй недели спринта, который начался в понедельник `start`. */
export const sprintEndDate = (start: IsoDate): IsoDate => addDays(start, 11);

/** Понедельник сразу после спринта: момент, с которого он считается оконченным. */
export const nextMondayAfterSprint = (end: IsoDate): IsoDate => addDays(end, 3);

export function sprintWorkdays(start: IsoDate): IsoDate[] {
  return Array.from({ length: SPRINT_WORKDAYS }, (_, index) =>
    addDays(start, index < 5 ? index : index + 2),
  );
}

/** Рабочие дни между датами, обе границы включены. */
export function countWorkdays(from: IsoDate, to: IsoDate): number {
  let count = 0;
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (isWorkday(date)) count += 1;
  }
  return count;
}

/** Секунды между моментами, попавшие на рабочие дни по поясу `timezone`. */
export function workingSeconds(from: Date, to: Date, timezone: string): number {
  if (to <= from) return 0;
  let total = 0;
  const lastDate = dateInZone(to, timezone);
  for (
    let date = dateInZone(from, timezone);
    date <= lastDate;
    date = addDays(date, 1)
  ) {
    if (!isWorkday(date)) continue;
    const dayStart = startOfDayInZone(date, timezone).getTime();
    const dayEnd = startOfDayInZone(addDays(date, 1), timezone).getTime();
    const overlap =
      Math.min(to.getTime(), dayEnd) - Math.max(from.getTime(), dayStart);
    if (overlap > 0) total += overlap;
  }
  return Math.floor(total / 1000);
}
