import { type Context, use } from 'react';

/**
 * Читает контекст и бросает ошибку, если провайдера выше нет.
 * `throw` в рендере ловит ближайший ErrorBoundary, а тип не содержит `null`.
 */
export function useStrictContext<T>(context: Context<null | T>): T {
  const value = use(context);
  if (value === null) {
    throw new Error(
      `${context.displayName ?? 'Контекст'} не найден: компонент должен быть внутри провайдера.`,
    );
  }
  return value;
}
