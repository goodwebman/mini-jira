import { TIMEZONES, type Timezone } from '@gwmt/contracts';

export const TIMEZONE_LABELS: Record<Timezone, string> = {
  'Europe/Moscow': 'Москва, UTC+3',
  'Asia/Yekaterinburg': 'Екатеринбург, UTC+5',
  'Asia/Novosibirsk': 'Новосибирск, UTC+7',
};

export const TIMEZONE_OPTIONS = TIMEZONES.map((value) => ({
  value,
  label: TIMEZONE_LABELS[value],
}));

export function isTimezone(value: string): value is Timezone {
  return (TIMEZONES as readonly string[]).includes(value);
}
