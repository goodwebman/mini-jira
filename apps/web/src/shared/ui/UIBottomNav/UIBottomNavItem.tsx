import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { Slot } from '@/shared/lib/dom';

import type { IUIBottomNavItemProps } from './types';

const UIBottomNavItemBase = forwardRef<HTMLElement, IUIBottomNavItemProps>(
  ({ className, icon, active = false, children, ...props }, ref) => (
    <Slot
      ref={ref}
      aria-current={active ? 'page' : undefined}
      data-name='UIBottomNavItem'
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-caption font-medium text-foreground no-underline focus-ring',
        '[&_svg]:size-icon aria-[current=page]:font-semibold aria-[current=page]:text-primary-hover',
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
