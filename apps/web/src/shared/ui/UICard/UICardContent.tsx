import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUICardContentProps } from './types';

const UICardContentBase = forwardRef<HTMLDivElement, IUICardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-name='UICardContent'
      className={cn('flex flex-col gap-3', className)}
      {...props}
    />
  ),
);
UICardContentBase.displayName = 'UICardContent';
export const UICardContent = memo(UICardContentBase);
