/** Месяцы как в макетах: «2 ноя», «27 окт – 7 ноя». */
const MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
] as const;

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

interface DateParts {
  readonly year: number;
  /** 0..11 */
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

const pad = (value: number) => String(value).padStart(2, '0');
const monthShort = (month: number) => MONTHS_SHORT[month] ?? '';

/**
 * Календарная дата `YYYY-MM-DD` без часового пояса.
 * `new Date('2026-11-02')` разбирается как UTC и в Москве уже 3 ноября.
 */
function parseIsoDate(value: string): DateParts {
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number);
  return { year, month: month - 1, day, hour: 0, minute: 0 };
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Момент времени в нужном поясе. Без пояса — пояс браузера. */
function zonedParts(iso: string, timeZone?: string): DateParts {
  const key = timeZone ?? '';
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    });
    formatters.set(key, formatter);
  }
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(iso))
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year ?? 0,
    month: (parts.month ?? 1) - 1,
    day: parts.day ?? 1,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
  };
}

/** `2026-11-02` → «2 ноя». */
export function formatDayMonth(isoDate: string): string {
  const { day, month } = parseIsoDate(isoDate);
  return `${String(day)} ${monthShort(month)}`;
}

/** Период спринта: «3–14 ноя» или «27 окт – 7 ноя». */
export function formatDateRange(startIso: string, endIso: string): string {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (start.month === end.month && start.year === end.year)
    return `${String(start.day)}–${String(end.day)} ${monthShort(end.month)}`;
  return `${formatDayMonth(startIso)} – ${formatDayMonth(endIso)}`;
}

/** Момент → «8 ноя». */
export function formatShortDate(iso: string, timeZone?: string): string {
  const { day, month } = zonedParts(iso, timeZone);
  return `${String(day)} ${monthShort(month)}`;
}

/** Момент → «08.11.2026». */
export function formatNumericDate(iso: string, timeZone?: string): string {
  const { day, month, year } = zonedParts(iso, timeZone);
  return `${pad(day)}.${pad(month + 1)}.${String(year)}`;
}

/** Момент → «8 ноя, 14:05». */
export function formatShortDateTime(iso: string, timeZone?: string): string {
  const { day, month, hour, minute } = zonedParts(iso, timeZone);
  return `${String(day)} ${monthShort(month)}, ${pad(hour)}:${pad(minute)}`;
}

/** Момент → «8 ноября 2026». */
export function formatLongDate(iso: string, timeZone?: string): string {
  const { day, month, year } = zonedParts(iso, timeZone);
  return `${String(day)} ${MONTHS_GENITIVE[month] ?? ''} ${String(year)}`;
}

const MINUTES_IN_HOUR = 60;
const MINUTES_IN_DAY = 1440;

/**
 * Длительность для таймера задачи: «меньше минуты», «45 мин», «3 ч 20 мин», «2 д 4 ч».
 * Отрицательное значение (часы клиента спешат) считается нулём.
 */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.floor(totalMinutes));
  if (minutes < 1) return 'меньше минуты';
  if (minutes < MINUTES_IN_HOUR) return `${String(minutes)} мин`;
  if (minutes < MINUTES_IN_DAY) {
    const hours = Math.floor(minutes / MINUTES_IN_HOUR);
    const rest = minutes % MINUTES_IN_HOUR;
    return rest
      ? `${String(hours)} ч ${String(rest)} мин`
      : `${String(hours)} ч`;
  }
  const days = Math.floor(minutes / MINUTES_IN_DAY);
  const hours = Math.floor((minutes % MINUTES_IN_DAY) / MINUTES_IN_HOUR);
  return hours ? `${String(days)} д ${String(hours)} ч` : `${String(days)} д`;
}
