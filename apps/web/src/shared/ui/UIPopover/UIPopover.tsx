import {
  type MouseEvent,
  cloneElement,
  forwardRef,
  isValidElement,
  memo,
  useId,
  useRef,
} from 'react';

import { useControllableState, useMergedRefs } from '@/shared/lib/hooks';

import { PopoverPanel } from './PopoverPanel';
import type { IUIPopoverProps, PopoverTriggerProps } from './types';

/**
 * Панель, привязанная к триггеру. Закрывается по клику снаружи и Escape.
 *
 * @example
 * <UIPopover trigger={<UIButton variant="secondary">Фильтры</UIButton>}>…</UIPopover>
 */
const UIPopoverBase = forwardRef<HTMLDivElement, IUIPopoverProps>(
  (
    {
      testId,
      trigger,
      children,
      open,
      onOpenChange,
      placement = 'bottom-start',
      gutter = 8,
      className,
      ariaLabel = 'Всплывающее окно',
    },
    ref,
  ) => {
    const [isOpen, setOpen] = useControllableState({
      value: open,
      defaultValue: false,
      onChange: onOpenChange,
    });
    const anchorRef = useRef<HTMLDivElement>(null);
    const mergedRef = useMergedRefs(anchorRef, ref);
    const panelId = useId();

    const triggerElement = isValidElement<PopoverTriggerProps>(trigger)
      ? cloneElement(trigger, {
          onClick: (event: MouseEvent<HTMLElement>) => {
            trigger.props.onClick?.(event);
            setOpen(!isOpen);
          },
          'aria-expanded': isOpen,
          'aria-haspopup': 'dialog',
          'aria-controls': isOpen ? panelId : undefined,
        })
      : trigger;

    return (
      <div
        ref={mergedRef}
        data-name={testId ? `UIPopover-${testId}` : 'UIPopover'}
        className='inline-flex'
      >
        {triggerElement}
        {isOpen && (
          <PopoverPanel
            id={panelId}
            anchorRef={anchorRef}
            placement={placement}
            gutter={gutter}
            className={className}
            ariaLabel={ariaLabel}
            onClose={() => {
              setOpen(false);
            }}
          >
            {children}
          </PopoverPanel>
        )}
      </div>
    );
  },
);
UIPopoverBase.displayName = 'UIPopover';
export const UIPopover = memo(UIPopoverBase);
export type { IUIPopoverProps } from './types';
