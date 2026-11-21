import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { UIButton } from '@/shared/ui/UIButton';

import type { IUIPageHeaderActionProps } from './types';

/** Главное действие шапки. На телефоне остаётся только иконка, подпись читает скринридер. */
const UIPageHeaderActionBase = forwardRef<
  HTMLButtonElement,
  IUIPageHeaderActionProps
>(({ className, icon, label, ...props }, ref) => (
  <UIButton
    ref={ref}
    className={cn(
      'shrink-0 pl-2 pr-3 max-w640:w-control max-w640:px-0',
      className,
    )}
    {...props}
  >
    {icon}
    <span className='max-w640:sr-only'>{label}</span>
  </UIButton>
));
UIPageHeaderActionBase.displayName = 'UIPageHeaderAction';
export const UIPageHeaderAction = memo(UIPageHeaderActionBase);
