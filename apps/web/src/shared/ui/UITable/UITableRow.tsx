import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUITableRowProps } from './types';

const UITableRowBase = forwardRef<HTMLTableRowElement, IUITableRowProps>(
  ({ className, selected = false, interactive, onClick, ...props }, ref) => (
    <tr
      ref={ref}
      data-name='UITableRow'
      data-selected={selected || undefined}
      onClick={onClick}
      className={cn(
        'relative border-b border-border last:border-b-0',
        (interactive ?? onClick != null) &&
          'cursor-pointer transition-colors duration-150 hover:bg-background',
        selected && 'bg-primary-tint hover:bg-primary-tint',
        className,
      )}
      {...props}
    />
  ),
);
UITableRowBase.displayName = 'UITableRow';
export const UITableRow = memo(UITableRowBase);
