import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUITableSectionProps } from './types';

const UITableHeadBase = forwardRef<
  HTMLTableSectionElement,
  IUITableSectionProps
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    data-name='UITableHead'
    className={cn('border-b border-border', className)}
    {...props}
  />
));
UITableHeadBase.displayName = 'UITableHead';
export const UITableHead = memo(UITableHeadBase);
