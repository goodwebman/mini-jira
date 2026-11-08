import { forwardRef, memo, useId, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { useEscape, useFocusTrap, useMergedRefs } from '../../lib/hooks';

export interface IUIDrawerProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  readonly testId?: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Заголовок панели; он же её доступное имя. */
  readonly title: ReactNode;
  /** Действия в шапке справа. */
  readonly actions?: ReactNode;
}

type DrawerPanelProps = Omit<IUIDrawerProps, 'open' | 'onOpenChange'> & {
  readonly onClose: () => void;
};

const DrawerPanel = forwardRef<HTMLElement, DrawerPanelProps>(
  ({ className, testId, title, actions, onClose, children, ...props }, ref) => {
    const panelRef = useRef<HTMLElement>(null);
    const mergedRef = useMergedRefs(panelRef, ref);
    const titleId = useId();

    useEscape(onClose);
    useFocusTrap(panelRef, true);

    return (
      <>
        <div
          aria-hidden="true"
          data-name="UIDrawerOverlay"
          className="absolute inset-0 z-30 animate-fade-in bg-overlay-soft"
          onClick={onClose}
        />
        <section
          ref={mergedRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          data-name={testId ? `UIDrawer-${testId}` : 'UIDrawer'}
          className={cn(
            'absolute inset-y-0 left-0 z-31 flex w-[min(600px,100%)] flex-col gap-3 overflow-y-auto',
            'bg-surface p-5 shadow-drawer outline-none scrollbar-thin xl:w-[min(720px,100%)]',
            className,
          )}
          {...props}
        >
          <div className="flex items-center gap-2">
            <h2 id={titleId} className="m-0 flex-1 text-title font-semibold">
              {title}
            </h2>
            {actions}
          </div>
          {children}
        </section>
      </>
    );
  },
);
DrawerPanel.displayName = 'UIDrawerPanel';

/**
 * Выезжающая панель поверх контента, например список досок. Рендерится на месте:
 * родитель должен быть `relative`, тогда сайдбар остаётся над панелью, как в дизайне.
 *
 * @example
 * <div className="relative flex-1">
 *   <UIDrawer open={open} onOpenChange={setOpen} title="Доски задач">…</UIDrawer>
 * </div>
 */
const UIDrawerBase = forwardRef<HTMLElement, IUIDrawerProps>(
  ({ open, onOpenChange, ...props }, ref) => {
    if (!open) {
      return null;
    }
    return (
      <DrawerPanel
        ref={ref}
        onClose={() => {
          onOpenChange(false);
        }}
        {...props}
      />
    );
  },
);
UIDrawerBase.displayName = 'UIDrawer';
export const UIDrawer = memo(UIDrawerBase);
