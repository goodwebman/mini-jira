import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUICardFooterProps } from './types';

const UICardFooterBase = forwardRef<HTMLDivElement, IUICardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-name='UICardFooter'
      className={cn('flex items-center gap-2', className)}
      {...props}
    />
  ),
);
UICardFooterBase.displayName = 'UICardFooter';
export const UICardFooter = memo(UICardFooterBase);
