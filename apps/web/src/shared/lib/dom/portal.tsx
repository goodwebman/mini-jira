import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface IPortalProps {
  readonly children: ReactNode;
  /** Контейнер для рендера; по умолчанию — `document.body`. */
  readonly container?: HTMLElement | null;
}

/**
 * Рендерит children в портал вне основного DOM-дерева. Контейнер доступен уже на
 * первом рендере — потребители могут сразу измерять содержимое (Tooltip, Popover).
 */
export function Portal({ children, container }: IPortalProps): ReactNode {
  if (typeof document === 'undefined') {
    return null;
  }
  return createPortal(children, container ?? document.body);
}
