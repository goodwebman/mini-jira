import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUIDialogBodyProps } from './types';

/** Прокручиваемая часть окна. */
const UIDialogBodyBase = forwardRef<HTMLDivElement, IUIDialogBodyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-name='UIDialogBody'
      className={cn(
        'min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin w640:px-6 w640:py-5',
        className,
      )}
      {...props}
    />
  ),
);
UIDialogBodyBase.displayName = 'UIDialogBody';
export const UIDialogBody = memo(UIDialogBodyBase);
