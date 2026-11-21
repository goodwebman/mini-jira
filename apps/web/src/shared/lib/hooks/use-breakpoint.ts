import { useSyncExternalStore } from 'react';

/** Границы макетов. Те же значения, что `--breakpoint-*` в styles/theme.css. */
export const BREAKPOINTS = {
  w320: 320,
  w375: 375,
  w438: 438,
  w640: 640,
  w960: 960,
  w1280: 1280,
  w1440: 1440,
  w1920: 1920,
  w2k: 2560,
  w4k: 3840,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

const breakpointNames = (Object.keys(BREAKPOINTS) as Breakpoint[]).reverse();

function subscribe(notify: () => void): () => void {
  window.addEventListener('resize', notify);
  return () => window.removeEventListener('resize', notify);
}

function getBreakpoint(): Breakpoint {
  const width = window.innerWidth;
  return breakpointNames.find((name) => width >= BREAKPOINTS[name]) ?? 'w320';
}

/**
 * Для JS-логики, которую не выразить классами (другая разметка на телефоне и т.п.).
 * Для вёрстки используй варианты `w640:`, `max-w960:` и другие из theme.css.
 */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, getBreakpoint, () => 'w320');
}
