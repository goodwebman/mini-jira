import { parseDecimal } from '@/shared/lib/format';

export const SP_ERROR = 'Введите число больше 0';

/** Оценка проходит те же границы, что и `spField` контракта: (0; 999], шаг 0,1. */
export function parseSp(input: string): null | number {
  const value = parseDecimal(input);
  if (value === null || value <= 0 || value > 999) return null;
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-9 ? value : null;
}
