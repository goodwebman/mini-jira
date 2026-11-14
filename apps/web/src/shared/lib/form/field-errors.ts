export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

interface IssueLike {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

/**
 * Ошибки схемы → текст под каждым полем. Берётся первая ошибка поля:
 * схемы контрактов уже пишут понятные русские тексты.
 */
export function issuesToFieldErrors(
  issues: readonly IssueLike[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field !== 'string' || field in errors) continue;
    errors[field] = issue.message;
  }
  return errors;
}

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/** Итог проверки формы: готовое тело запроса или ошибки по полям. */
export type FormResult<T, F extends string> =
  | { readonly ok: false; readonly errors: FieldErrors<F> }
  | { readonly ok: true; readonly value: T };
