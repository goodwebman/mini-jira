import { useEffect, useRef } from 'react';

export function useCommentTarget(navigationKey?: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !navigationKey) return;
    element.dataset.highlighted = 'true';
    element.scrollIntoView({
      block: 'center',
      behavior: globalThis.matchMedia('(prefers-reduced-motion: reduce)')
        .matches
        ? 'instant'
        : 'smooth',
    });
    element.focus({ preventScroll: true });
    const timer = globalThis.setTimeout(() => {
      delete element.dataset.highlighted;
    }, 5000);
    return () => {
      globalThis.clearTimeout(timer);
      delete element.dataset.highlighted;
    };
  }, [navigationKey]);
  return ref;
}
