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
        'min-h-0 flex-1 overflow-y-auto px-6 py-5 scrollbar-thin',
        className,
      )}
      {...props}
    />
  ),
);
UIDialogBodyBase.displayName = 'UIDialogBody';
export const UIDialogBody = memo(UIDialogBodyBase);
