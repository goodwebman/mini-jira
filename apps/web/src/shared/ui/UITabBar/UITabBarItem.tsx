import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { Slot } from '@/shared/lib/dom';

import type { IUITabBarItemProps } from './types';

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
