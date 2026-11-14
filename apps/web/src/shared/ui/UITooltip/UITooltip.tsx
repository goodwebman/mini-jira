import {
  type ReactElement,
  cloneElement,
  forwardRef,
  isValidElement,
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
} from 'react';

import { cn } from '@/shared/lib/cn';
import {
  useControllableState,
  useEscape,
  useMergedRefs,
} from '@/shared/lib/hooks';

import { TooltipBubble } from './TooltipBubble';
import type { IUITooltipProps } from './types';

/**
 * Всплывающая подсказка: по наведению и по фокусу, Escape закрывает.
 *
 * @example
 * <UITooltip content="Администратор запретил брать задачу в работу">
 *   <UIBadge tone="warning">Запрет</UIBadge>
 * </UITooltip>
 */
const UITooltipBase = forwardRef<HTMLSpanElement, IUITooltipProps>(
  (
    {
      testId,
      children,
      className,
      content,
      placement = 'top',
      gutter = 6,
      delay = 300,
      open,
      onOpenChange,
    },
    ref,
  ) => {
    const [isOpen, setOpen] = useControllableState({
      value: open,
      defaultValue: false,
      onChange: onOpenChange,
    });
    const anchorRef = useRef<HTMLSpanElement>(null);
    const mergedRef = useMergedRefs(anchorRef, ref);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );
    const tooltipId = useId();

    const visible =
      isOpen && content != null && content !== false && content !== '';

    const show = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setOpen(true);
      }, delay);
    };

    const hide = useCallback(() => {
      clearTimeout(timerRef.current);
      setOpen(false);
    }, [setOpen]);

    useEffect(
      () => () => {
        clearTimeout(timerRef.current);
      },
      [],
    );

    // stacked: false — подсказка не должна «съедать» Escape у модалки, в которой лежит
    useEscape(hide, visible, { stacked: false });

    // aria-describedby на самом триггере: с обёртки скринридер описание не прочитает
    const anchored =
      visible && isValidElement(children)
        ? cloneElement(
            children as ReactElement<{ 'aria-describedby'?: string }>,
            {
              'aria-describedby': tooltipId,
            },
          )
        : children;

    return (
      <span
        ref={mergedRef}
        data-name={testId ? `UITooltip-${testId}` : 'UITooltip'}
        className={cn('inline-flex', className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {anchored}
        {visible && (
          <TooltipBubble
            id={tooltipId}
            content={content}
            anchorRef={anchorRef}
            placement={placement}
            gutter={gutter}
          />
        )}
      </span>
    );
  },
);
UITooltipBase.displayName = 'UITooltip';
export const UITooltip = memo(UITooltipBase);
export type { IUITooltipProps } from './types';
