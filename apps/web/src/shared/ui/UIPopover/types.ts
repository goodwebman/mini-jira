import { type MouseEvent, type ReactNode, type RefObject } from 'react';

import { type Placement } from '@/shared/lib/dom';

export interface IUIPopoverProps {
  readonly testId?: string;
  /** Триггер, обычно UIButton. */
  readonly trigger: ReactNode;
  readonly children?: ReactNode;
  /** Управляемое состояние. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly placement?: Placement;
  /** Отступ от триггера, px. */
  readonly gutter?: number;
  /** Класс панели. */
  readonly className?: string;
  /** Доступное имя панели. */
  readonly ariaLabel?: string;
}
export interface PopoverTriggerProps {
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: 'dialog';
  'aria-controls'?: string;
}
export interface PopoverPanelProps {
  readonly id: string;
  readonly anchorRef: RefObject<HTMLElement | null>;
  readonly placement: Placement;
  readonly gutter: number;
  readonly className: string | undefined;
  readonly ariaLabel: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}
