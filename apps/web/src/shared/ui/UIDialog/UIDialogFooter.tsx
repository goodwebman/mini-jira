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
        'flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4',
        className,
      )}
      {...props}
    />
  ),
);
UIDialogFooterBase.displayName = 'UIDialogFooter';
export const UIDialogFooter = memo(UIDialogFooterBase);
