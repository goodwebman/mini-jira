/** Число с одним знаком после запятой без хвостовых нулей: 3 → «3», 2.25 → «2,3». */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  // -0 после округления маленьких отрицательных: показываем «0»
  return String(rounded === 0 ? 0 : rounded).replace('.', ',');
}

/** Оценка в story points: «5 SP», «2,5 SP». */
export function formatSp(value: number): string {
  return `${formatNumber(value)} SP`;
}

/** Процент от целого, округлённый до целого; при пустом целом — 0. */
export function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/**
 * Десятичное число из поля ввода: принимает и запятую, и точку.
 * Пустая строка и мусор дают `null`, чтобы форма показала ошибку, а не NaN.
 */
export function parseDecimal(input: string): null | number {
  const normalized = input.trim().replace(',', '.');
  if (normalized === '' || !/^-?\d*\.?\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
