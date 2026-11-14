import { type HTMLAttributes } from 'react';

import { type ISlotProps } from '@/shared/lib/dom';

export interface IUITabBarProps extends HTMLAttributes<HTMLElement> {
  readonly testId?: string;
}

export interface IUITabBarItemProps extends Omit<ISlotProps, 'as'> {
  readonly active?: boolean;
}
