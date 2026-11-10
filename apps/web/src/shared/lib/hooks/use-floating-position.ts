import { computePosition, type Placement } from '@/shared/lib/dom/position';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

/** Ковариантная ссылка: принимает ref любого конкретного тега без каста. */
export interface FloatingElementRef {
  readonly current: HTMLElement | null;
}

export interface UseFloatingPositionArgs {
  /** Элемент-якорь. */
  readonly anchorRef: FloatingElementRef;
  /** Всплывающий элемент. Должен стартовать с классов `fixed left-0 top-0 invisible`. */
  readonly floatingRef: FloatingElementRef;
  /** Открыт ли floating-элемент. */
  readonly open: boolean;
  /** Желаемое размещение (по умолчанию `bottom-start`). */
  readonly placement?: Placement;
  /** Отступ от якоря, px (по умолчанию 8). */
  readonly gutter?: number;
  /** Выставить CSS-переменную `--anchor-width` — для списков шириной с триггер. */
  readonly matchWidth?: boolean;
}

/**
 * Позиционирует floating-элемент относительно якоря (flip + shift, см. `computePosition`).
 *
 * Пишет координаты напрямую в `style`, минуя state: на скролле нет ре-рендеров, а замер
 * идёт в layout-эффекте — до paint, контент не мигает. Пересчитывает на scroll любого
 * контейнера, resize окна и изменение размеров якоря или контента.
 */
export function useFloatingPosition({
  anchorRef,
  floatingRef,
  open,
  placement = 'bottom-start',
  gutter = 8,
  matchWidth = false,
}: UseFloatingPositionArgs): void {
  useIsomorphicLayoutEffect(() => {
    const anchor = anchorRef.current;
    const floating = floatingRef.current;
    if (!open || !anchor || !floating) {
      return;
    }

    const update = () => {
      const rect = anchor.getBoundingClientRect();
      if (matchWidth) {
        floating.style.setProperty('--anchor-width', `${String(rect.width)}px`);
      }
      const result = computePosition(
        rect,
        { width: floating.offsetWidth, height: floating.offsetHeight },
        placement,
        { gutter },
      );
      floating.style.top = `${String(result.top)}px`;
      floating.style.left = `${String(result.left)}px`;
      floating.style.visibility = 'visible';
      floating.dataset.placement = result.placement;
    };

    update();

    // capture: скролл не всплывает, а ловить надо любой родительский контейнер
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(anchor);
    observer?.observe(floating);

    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [anchorRef, floatingRef, open, placement, gutter, matchWidth]);
}
