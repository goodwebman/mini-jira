import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUIDialogFooterProps } from './types';

/** Подвал с действиями, выровненными вправо. */
const UIDialogFooterBase = forwardRef<HTMLDivElement, IUIDialogFooterProps>(
  ({ className, ...props }, ref) => (
    <footer
      ref={ref}
      data-name='UIDialogFooter'
      className={cn(
        'flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-4 pt-4 pb-[max(var(--space-4),env(safe-area-inset-bottom))] w640:px-6',
        className,
      )}
      {...props}
    />
  ),
);
UIDialogFooterBase.displayName = 'UIDialogFooter';
export const UIDialogFooter = memo(UIDialogFooterBase);
