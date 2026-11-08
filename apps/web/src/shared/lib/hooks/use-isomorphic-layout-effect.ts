import { useEffect, useLayoutEffect } from 'react';

/**
 * `useLayoutEffect` без React-warning при SSR. Нужен для измерения и позиционирования
 * floating-элементов до paint — иначе всплывающий контент мигает.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
