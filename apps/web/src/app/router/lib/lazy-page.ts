import type { ComponentType } from 'react';

/**
 * Ленивая страница для `lazy` роута: чанк грузится при первом переходе.
 * `import()` пишется литералом у вызова — так его видят и бандлер, и ESLint
 * (динамический импорт тоже обязан идти через публичный `index.ts` слайса).
 *
 * @example
 * lazy: lazyPage(() => import('@/pages/kpi'), (page) => page.KpiPage)
 */
export function lazyPage<M>(
  load: () => Promise<M>,
  pick: (module: M) => ComponentType,
): () => Promise<{ Component: ComponentType }> {
  return async () => ({ Component: pick(await load()) });
}
