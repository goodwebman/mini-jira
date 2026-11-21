import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUITabBarProps } from './types';

/**
 * Вкладки разделов под шапкой от 640 до 960 px.
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
        'hidden h-[48px] flex-none border-b border-border bg-surface px-2 w640:flex w960:hidden',
        className,
      )}
      {...props}
    />
  ),
);
UITabBarRootBase.displayName = 'UITabBar';
export const UITabBarRoot = memo(UITabBarRootBase);
