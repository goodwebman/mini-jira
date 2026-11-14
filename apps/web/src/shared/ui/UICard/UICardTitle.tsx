import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUICardTitleProps } from './types';

const UICardTitleBase = forwardRef<HTMLHeadingElement, IUICardTitleProps>(
  ({ className, size = 'sm', as: Heading = 'h2', ...props }, ref) => (
    <Heading
      ref={ref}
      data-name='UICardTitle'
      className={cn(
        'm-0 font-semibold',
        size === 'sm' ? 'text-body' : 'text-title',
        className,
      )}
      {...props}
    />
  ),
);
UICardTitleBase.displayName = 'UICardTitle';
export const UICardTitle = memo(UICardTitleBase);
