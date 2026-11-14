import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUIBottomNavProps } from './types';

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
      className={cn(
        'flex h-[64px] flex-none border-t border-border bg-surface sm:hidden',
        className,
      )}
      {...props}
    />
  ),
);
UIBottomNavRootBase.displayName = 'UIBottomNav';
export const UIBottomNavRoot = memo(UIBottomNavRootBase);
