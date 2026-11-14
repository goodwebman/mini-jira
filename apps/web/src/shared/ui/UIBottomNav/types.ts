import { type HTMLAttributes, type ReactNode } from 'react';

import { type ISlotProps } from '@/shared/lib/dom';

export interface IUIBottomNavProps extends HTMLAttributes<HTMLElement> {
  readonly testId?: string;
}

export interface IUIBottomNavItemProps extends Omit<ISlotProps, 'as'> {
  readonly icon: ReactNode;
  readonly active?: boolean;
}
