import { type Ref, type RefCallback, useCallback } from 'react';

import { mergeRefs } from '@/shared/lib/dom/merge-refs';

/** Стабильный callback-ref, который пишет узел сразу в два ref'а (свой и `forwardRef`). */
export function useMergedRefs<T>(
  first: Ref<T> | undefined,
  second: Ref<T> | undefined,
): RefCallback<T> {
  return useCallback(
    (node: null | T) => mergeRefs(first, second)(node),
    [first, second],
  );
}
