import { type HTMLAttributes, forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { type ISlotProps, Slot } from '@/shared/lib/dom';

export interface IUITabBarProps extends HTMLAttributes<HTMLElement> {
  readonly testId?: string;
}

/**
 * Вкладки разделов под шапкой. Видны только на ширине 520–799.
 *
 * @example
 * <UITabBar aria-label="Основная навигация">
 *   <UITabBar.Item active render={<Link to="/boards" />}>Доски</UITabBar.Item>
 * </UITabBar>
 */
const UITabBarRootBase = forwardRef<HTMLElement, IUITabBarProps>(
  ({ className, testId, ...props }, ref) => (
    <nav
      ref={ref}
      data-name={testId ? `UITabBar-${testId}` : 'UITabBar'}
      className={cn(
        'hidden h-[48px] flex-none border-b border-border bg-surface px-2 sm:flex md:hidden',
        className,
      )}
      {...props}
    />
  ),
);
UITabBarRootBase.displayName = 'UITabBar';
export const UITabBarRoot = memo(UITabBarRootBase);

export interface IUITabBarItemProps extends Omit<ISlotProps, 'as'> {
  readonly active?: boolean;
}

const UITabBarItemBase = forwardRef<HTMLElement, IUITabBarItemProps>(
  ({ className, active = false, ...props }, ref) => (
    <Slot
      ref={ref}
      aria-current={active ? 'page' : undefined}
      data-name='UITabBarItem'
      className={cn(
        'flex min-w-0 flex-1 items-center justify-center whitespace-nowrap font-medium text-foreground no-underline focus-ring',
        'aria-[current=page]:font-semibold aria-[current=page]:text-primary-hover aria-[current=page]:shadow-[inset_0_-2px_var(--primary)]',
        className,
      )}
      {...props}
    />
  ),
);
UITabBarItemBase.displayName = 'UITabBarItem';
export const UITabBarItem = memo(UITabBarItemBase);
