import { useEffect, useState, type RefObject } from 'react';
import { createLayerStack } from '../dom/layer-stack';

const trapLayers = createLayerStack();

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'textarea:not(:disabled)',
  'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.closest('[inert]') &&
      (typeof element.checkVisibility !== 'function' ||
        element.checkVisibility({ visibilityProperty: true })),
  );
}

function focusInitial(root: HTMLElement): void {
  if (root.contains(document.activeElement)) {
    return; // уже сработал autoFocus внутри
  }
  const explicit = root.querySelector<HTMLElement>('[data-autofocus]');
  const first = getFocusable(root).find((element) => !element.hasAttribute('data-focus-skip'));
  (explicit ?? first ?? root).focus();
}

/**
 * Удерживает фокус (Tab / Shift+Tab) внутри контейнера.
 *
 * При активации ставит фокус на `[data-autofocus]`, иначе на первый интерактивный
 * элемент (элементы с `data-focus-skip`, например крестик, пропускаются), иначе на
 * сам контейнер — ему нужен `tabIndex={-1}`. При деактивации возвращает фокус назад.
 * Вложенные ловушки не конфликтуют: работает только верхняя.
 *
 * @param ref контейнер
 * @param active включена ли ловушка
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  // Снимок на рендере: к моменту эффекта autoFocus уже мог увести фокус внутрь контейнера
  const [focusedOnMount] = useState<Element | null>(() =>
    typeof document === 'undefined' ? null : document.activeElement,
  );

  useEffect(() => {
    const node = ref.current;
    if (!active || !node) {
      return;
    }

    const previous = node.contains(document.activeElement)
      ? focusedOnMount
      : document.activeElement;
    const layer = trapLayers.push();

    focusInitial(node);

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !trapLayers.isTop(layer)) {
        return;
      }

      const items = getFocusable(node);
      if (items.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      const outside = !node.contains(current);

      if (event.shiftKey && (current === first || current === node || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handler);

    return () => {
      document.removeEventListener('keydown', handler);
      trapLayers.remove(layer);
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus();
      }
    };
  }, [ref, active, focusedOnMount]);
}
