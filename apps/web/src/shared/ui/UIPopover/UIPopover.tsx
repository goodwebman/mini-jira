import {
  cloneElement,
  forwardRef,
  isValidElement,
  memo,
  useId,
  useMemo,
  useRef,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { cn } from '../../lib/cn';
import { Portal, type Placement } from '../../lib/dom';
import {
  useControllableState,
  useEscape,
  useFloatingPosition,
  useFocusTrap,
  useMergedRefs,
  useOutsideClick,
} from '../../lib/hooks';

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

interface PopoverTriggerProps {
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: 'dialog';
  'aria-controls'?: string;
}

interface PopoverPanelProps {
  readonly id: string;
  readonly anchorRef: RefObject<HTMLElement | null>;
  readonly placement: Placement;
  readonly gutter: number;
  readonly className: string | undefined;
  readonly ariaLabel: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

function PopoverPanel({
  id,
  anchorRef,
  placement,
  gutter,
  className,
  ariaLabel,
  onClose,
  children,
}: PopoverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const ignoreRefs = useMemo(() => [anchorRef], [anchorRef]);

  useFloatingPosition({ anchorRef, floatingRef: panelRef, open: true, placement, gutter });
  useFocusTrap(panelRef, true);
  useEscape(onClose);
  useOutsideClick(panelRef, onClose, { ignoreRefs });

  return (
    <Portal>
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-label={ariaLabel}
        tabIndex={-1}
        data-name="UIPopoverContent"
        className={cn(
          'invisible fixed left-0 top-0 z-60 min-w-[192px] rounded-block border border-border bg-surface p-4 text-foreground shadow-popover outline-none',
          className,
        )}
      >
        {children}
      </div>
    </Portal>
  );
}

/**
 * Панель, привязанная к триггеру. Закрывается по клику снаружи и Escape.
 *
 * @example
 * <UIPopover trigger={<UIButton variant="secondary">Фильтры</UIButton>}>…</UIPopover>
 */
const UIPopoverBase = forwardRef<HTMLDivElement, IUIPopoverProps>(
  (
    { testId, trigger, children, open, onOpenChange, placement = 'bottom-start', gutter = 8, className, ariaLabel = 'Всплывающее окно' },
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
        className="inline-flex"
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
