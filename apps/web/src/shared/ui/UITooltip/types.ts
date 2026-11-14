import { type ReactNode, type RefObject } from 'react';

import { type Placement } from '@/shared/lib/dom';

export interface IUITooltipProps {
  readonly testId?: string;
  /** Элемент, на котором показывается подсказка. */
  readonly children?: ReactNode;
  /** Класс обёртки вокруг элемента. */
  readonly className?: string;
  /** Текст подсказки. Пустой контент подсказку не показывает. */
  readonly content?: ReactNode;
  readonly placement?: Placement;
  /** Отступ от элемента, px. */
  readonly gutter?: number;
  /** Задержка показа, мс. */
  readonly delay?: number;
  /** Управляемое состояние. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}
export interface TooltipBubbleProps {
  readonly id: string;
  readonly content: ReactNode;
  readonly anchorRef: RefObject<HTMLElement | null>;
  readonly placement: Placement;
  readonly gutter: number;
}
