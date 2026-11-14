import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUITableHeadCellProps } from './types';

const UITableHeadCellBase = forwardRef<
  HTMLTableCellElement,
  IUITableHeadCellProps
>(({ className, scope = 'col', ...props }, ref) => (
  <th
    ref={ref}
    scope={scope}
    data-name='UITableHeadCell'
    className={cn(
      'h-control whitespace-nowrap px-2 text-left text-caption font-semibold text-muted-foreground first:pl-3 last:pr-3',
      className,
    )}
    {...props}
  />
));
UITableHeadCellBase.displayName = 'UITableHeadCell';
export const UITableHeadCell = memo(UITableHeadCellBase);
