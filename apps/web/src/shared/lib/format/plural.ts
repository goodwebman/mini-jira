export type PluralForms = readonly [one: string, few: string, many: string];

/**
 * Русская форма слова для числа: 1 задача, 3 задачи, 5 задач, 11 задач, 21 задача.
 * Дробные числа идут во «few»: 1,5 дня, 2,5 дня.
 */
export function pluralRu(count: number, forms: PluralForms): string {
  const [one, few, many] = forms;
  if (!Number.isInteger(count)) return few;
  const abs = Math.abs(count);
  const lastTwo = abs % 100;
  const last = abs % 10;
  if (lastTwo > 10 && lastTwo < 20) return many;
  if (last === 1) return one;
  if (last > 1 && last < 5) return few;
  return many;
}

/** «5 задач», «1 участник». */
export function countLabel(count: number, forms: PluralForms): string {
  return `${String(count)} ${pluralRu(count, forms)}`;
}
