import { useCallback, type Ref, type RefCallback } from 'react';
import { mergeRefs } from '../dom/merge-refs';

/** Стабильный callback-ref, который пишет узел сразу в два ref'а (свой и `forwardRef`). */
export function useMergedRefs<T>(
  first: Ref<T> | undefined,
  second: Ref<T> | undefined,
): RefCallback<T> {
  return useCallback((node: T | null) => mergeRefs(first, second)(node), [first, second]);
}
