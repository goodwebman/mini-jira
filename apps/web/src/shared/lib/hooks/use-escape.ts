import { useEffect, useEffectEvent } from 'react';

import { createLayerStack } from '@/shared/lib/dom/layer-stack';

const escapeLayers = createLayerStack();

export interface UseEscapeOptions {
  /**
   * Участвует ли слой в стеке оверлеев (по умолчанию true): среагирует только верхний.
   * Для подсказок — `false`: они не должны «съедать» Escape у модалки под ними.
   */
  readonly stacked?: boolean;
}

/**
 * Вызывает `callback` по Escape. При вложенных оверлеях срабатывает только верхний.
 * Вложенный обработчик может отменить закрытие через `event.preventDefault()`.
 *
 * @param callback действие на Escape (стабилизировать не нужно)
 * @param enabled слушать ли Escape
 */
export function useEscape(
  callback: () => void,
  enabled = true,
  { stacked = true }: UseEscapeOptions = {},
): void {
  const onEscape = useEffectEvent(callback);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const layer = stacked ? escapeLayers.push() : null;

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return;
      }
      if (layer && !escapeLayers.isTop(layer)) {
        return;
      }
      onEscape();
    };

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      if (layer) {
        escapeLayers.remove(layer);
      }
    };
  }, [enabled, stacked]);
}
