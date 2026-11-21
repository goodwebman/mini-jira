import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUIBottomNavProps } from './types';

/**
 * Нижнее меню телефона на ширинах меньше 640 px.
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
        'flex h-[calc(64px+env(safe-area-inset-bottom))] flex-none border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] w640:hidden',
        className,
      )}
      {...props}
    />
  ),
);
UIBottomNavRootBase.displayName = 'UIBottomNav';
export const UIBottomNavRoot = memo(UIBottomNavRootBase);
