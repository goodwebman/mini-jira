import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUICardHeaderProps } from './types';

/** Шапка блока: заголовок слева, действие или легенда справа. */
const UICardHeaderBase = forwardRef<HTMLDivElement, IUICardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-name='UICardHeader'
      className={cn(
        'flex min-h-[24px] flex-wrap items-center justify-between gap-x-3 gap-y-1',
        className,
      )}
      {...props}
    />
  ),
);
UICardHeaderBase.displayName = 'UICardHeader';
export const UICardHeader = memo(UICardHeaderBase);
