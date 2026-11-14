import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { Slot } from '@/shared/lib/dom';

import type { IUITableRowLinkProps } from './types';

/**
 * Ссылка на всю строку: клик где угодно по строке ведёт по ней, а Tab и средняя
 * кнопка мыши работают как у обычной ссылки. Кладётся в одну из ячеек.
 */
const UITableRowLinkBase = forwardRef<HTMLElement, IUITableRowLinkProps>(
  ({ className, ...props }, ref) => (
    <Slot
      ref={ref}
      data-name='UITableRowLink'
      className={cn(
        'rounded-[2px] font-medium text-foreground no-underline focus-ring after:absolute after:inset-0',
        className,
      )}
      {...props}
    />
  ),
);
UITableRowLinkBase.displayName = 'UITableRowLink';
export const UITableRowLink = memo(UITableRowLinkBase);
