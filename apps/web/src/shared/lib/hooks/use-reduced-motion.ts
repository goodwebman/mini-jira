import { useMediaQuery } from './use-media-query';

/**
 * `true`, когда пользователь просит уменьшить движение. CSS-анимации гасятся глобально
 * в styles/base.css, а JS-анимации обязаны проверять этот хук сами.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
