import type { Ref, RefCallback } from 'react';

type Cleanup = () => void;

function assignRef<T>(ref: Ref<T> | undefined, node: null | T): Cleanup | void {
  if (typeof ref === 'function') {
    return ref(node);
  }
  if (ref) {
    ref.current = node;
  }
}

/**
 * Склеивает несколько ref'ов в один callback-ref. Нужен, когда компонент держит свой
 * ref на DOM-узел и одновременно пробрасывает `forwardRef` наружу.
 * Поддерживает cleanup-функции callback-ref'ов из React 19.
 *
 * Внутри компонентов используй {@link useMergedRefs}: он стабилен между рендерами.
 */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    const cleanups = refs.map((ref) => assignRef(ref, node));
    if (!cleanups.some((cleanup) => typeof cleanup === 'function')) {
      return;
    }
    return () => {
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index];
        if (typeof cleanup === 'function') {
          cleanup();
        } else {
          assignRef(ref, null);
        }
      });
    };
  };
}
