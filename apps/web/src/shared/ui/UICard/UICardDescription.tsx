import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

import type { IUICardDescriptionProps } from './types';

const UICardDescriptionBase = forwardRef<
  HTMLParagraphElement,
  IUICardDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-name='UICardDescription'
    className={cn('m-0 text-body text-muted-foreground', className)}
    {...props}
  />
));
UICardDescriptionBase.displayName = 'UICardDescription';
export const UICardDescription = memo(UICardDescriptionBase);
