import {
  cloneElement,
  forwardRef,
  isValidElement,
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { cn } from '../../lib/cn';
import { Portal, type Placement } from '../../lib/dom';
import {
  useControllableState,
  useEscape,
  useFloatingPosition,
  useMergedRefs,
} from '../../lib/hooks';

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

interface TooltipBubbleProps {
  readonly id: string;
  readonly content: ReactNode;
  readonly anchorRef: RefObject<HTMLElement | null>;
  readonly placement: Placement;
  readonly gutter: number;
}

function TooltipBubble({ id, content, anchorRef, placement, gutter }: TooltipBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  useFloatingPosition({ anchorRef, floatingRef: bubbleRef, open: true, placement, gutter });

  return (
    <Portal>
      <div
        ref={bubbleRef}
        id={id}
        role="tooltip"
        data-name="UITooltipContent"
        className="invisible fixed left-0 top-0 z-60 max-w-[320px] rounded-control border border-border bg-surface px-3 py-2 text-body text-foreground shadow-popover"
      >
        {content}
      </div>
    </Portal>
  );
}

/**
 * Всплывающая подсказка: по наведению и по фокусу, Escape закрывает.
 *
 * @example
 * <UITooltip content="Администратор запретил брать задачу в работу">
 *   <UIBadge tone="warning">Запрет</UIBadge>
 * </UITooltip>
 */
const UITooltipBase = forwardRef<HTMLSpanElement, IUITooltipProps>(
  ({ testId, children, className, content, placement = 'top', gutter = 6, delay = 300, open, onOpenChange }, ref) => {
    const [isOpen, setOpen] = useControllableState({
      value: open,
      defaultValue: false,
      onChange: onOpenChange,
    });
    const anchorRef = useRef<HTMLSpanElement>(null);
    const mergedRef = useMergedRefs(anchorRef, ref);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const tooltipId = useId();

    const visible = isOpen && content != null && content !== false && content !== '';

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
        ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
            'aria-describedby': tooltipId,
          })
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
