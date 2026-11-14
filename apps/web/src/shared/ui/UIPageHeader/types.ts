import { type HTMLAttributes, type ReactNode } from 'react';

import { type IUIButtonProps } from '@/shared/ui/UIButton';

export interface IUIPageHeaderProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'title'
> {
  readonly testId?: string;
  readonly title: ReactNode;
  /** Подпись под заголовком. */
  readonly caption?: ReactNode;
  /** Если передан, слева появляется кнопка «Назад». */
  readonly onBack?: () => void;
  readonly backLabel?: string;
  /** Если передан, заголовок становится кнопкой-переключателем с шевроном. */
  readonly onTitleClick?: () => void;
  /** Действия справа. */
  readonly actions?: ReactNode;
}

export interface IUIPageHeaderActionProps extends IUIButtonProps {
  readonly icon: ReactNode;
  readonly label: string;
}
