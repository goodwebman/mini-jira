import { useMediaQuery } from './use-media-query';

/** Границы макетов. Те же значения, что `--breakpoint-*` в styles/theme.css. */
export const BREAKPOINTS = { sm: 520, md: 800, lg: 1280, xl: 1800 } as const;

/**
 * Текущий макет из дизайна:
 * `phone` (375) · `tablet` (640) · `laptop` (960) · `desktop` (1440) · `wide` (1920).
 */
export type Breakpoint = 'desktop' | 'laptop' | 'phone' | 'tablet' | 'wide';

/**
 * Для JS-логики, которую не выразить классами (другая разметка на телефоне и т.п.).
 * Для всего остального — responsive-варианты Tailwind `sm:` / `md:` / `lg:` / `xl:`.
 */
export function useBreakpoint(): Breakpoint {
  const isSm = useMediaQuery(`(min-width: ${String(BREAKPOINTS.sm)}px)`);
  const isMd = useMediaQuery(`(min-width: ${String(BREAKPOINTS.md)}px)`);
  const isLg = useMediaQuery(`(min-width: ${String(BREAKPOINTS.lg)}px)`);
  const isXl = useMediaQuery(`(min-width: ${String(BREAKPOINTS.xl)}px)`);

  if (isXl) return 'wide';
  if (isLg) return 'desktop';
  if (isMd) return 'laptop';
  if (isSm) return 'tablet';
  return 'phone';
}
