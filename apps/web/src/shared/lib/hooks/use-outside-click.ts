import { type RefObject, useEffect, useEffectEvent } from 'react';

export interface UseOutsideClickOptions {
  /** Слушать ли клики (по умолчанию true). */
  readonly enabled?: boolean;
  /** Клик по этим элементам не считается внешним (например, кнопка-триггер). */
  readonly ignoreRefs?: readonly RefObject<HTMLElement | null>[];
}

/**
 * Вызывает `callback` при `pointerdown` вне элемента `ref` и вне `ignoreRefs`.
 * Стабилизировать `callback` и `ignoreRefs` не нужно.
 */
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  { enabled = true, ignoreRefs = [] }: UseOutsideClickOptions = {},
): void {
  const onPointerDown = useEffectEvent((event: PointerEvent) => {
    const target = event.target;
    const node = ref.current;
    if (!(target instanceof Node) || !node || node.contains(target)) {
      return;
    }
    if (ignoreRefs.some((ignored) => ignored.current?.contains(target))) {
      return;
    }
    callback();
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handler = (event: PointerEvent) => {
      onPointerDown(event);
    };
    document.addEventListener('pointerdown', handler);
    return () => {
      document.removeEventListener('pointerdown', handler);
    };
  }, [enabled]);
}
