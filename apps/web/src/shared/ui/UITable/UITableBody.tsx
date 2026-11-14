import { forwardRef, memo } from 'react';

import type { IUITableSectionProps } from './types';

const UITableBodyBase = forwardRef<
  HTMLTableSectionElement,
  IUITableSectionProps
>(({ className, ...props }, ref) => (
  <tbody ref={ref} data-name='UITableBody' className={className} {...props} />
));
UITableBodyBase.displayName = 'UITableBody';
export const UITableBody = memo(UITableBodyBase);
