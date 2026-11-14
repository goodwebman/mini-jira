import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUITableCellProps } from './types';

const UITableCellBase = forwardRef<HTMLTableCellElement, IUITableCellProps>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      data-name='UITableCell'
      className={cn(
        'h-table-row px-2 text-body first:pl-3 last:pr-3',
        className,
      )}
      {...props}
    />
  ),
);
UITableCellBase.displayName = 'UITableCell';
export const UITableCell = memo(UITableCellBase);
