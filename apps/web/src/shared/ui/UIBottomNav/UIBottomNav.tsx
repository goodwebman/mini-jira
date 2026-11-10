import { forwardRef, memo, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Slot, type ISlotProps } from '@/shared/lib/dom';

export interface IUIBottomNavProps extends HTMLAttributes<HTMLElement> {
  readonly testId?: string;
}

/**
 * Нижнее меню телефона. Видно только на ширине до 520.
 *
 * @example
 * <UIBottomNav aria-label="Основная навигация">
 *   <UIBottomNav.Item active icon={<UIIcons.Board />} render={<Link to="/boards" />}>Доски</UIBottomNav.Item>
 * </UIBottomNav>
 */
const UIBottomNavRootBase = forwardRef<HTMLElement, IUIBottomNavProps>(
  ({ className, testId, ...props }, ref) => (
    <nav
      ref={ref}
      data-name={testId ? `UIBottomNav-${testId}` : 'UIBottomNav'}
      className={cn('flex h-[64px] flex-none border-t border-border bg-surface sm:hidden', className)}
      {...props}
    />
  ),
);
UIBottomNavRootBase.displayName = 'UIBottomNav';
export const UIBottomNavRoot = memo(UIBottomNavRootBase);

export interface IUIBottomNavItemProps extends Omit<ISlotProps, 'as'> {
  readonly icon: ReactNode;
  readonly active?: boolean;
}

const UIBottomNavItemBase = forwardRef<HTMLElement, IUIBottomNavItemProps>(
  ({ className, icon, active = false, children, ...props }, ref) => (
    <Slot
      ref={ref}
      aria-current={active ? 'page' : undefined}
      data-name="UIBottomNavItem"
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-[2px] text-caption font-medium text-foreground no-underline focus-ring',
        '[&_svg]:size-icon-lg aria-[current=page]:font-semibold aria-[current=page]:text-primary-hover',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </Slot>
  ),
);
UIBottomNavItemBase.displayName = 'UIBottomNavItem';
export const UIBottomNavItem = memo(UIBottomNavItemBase);
