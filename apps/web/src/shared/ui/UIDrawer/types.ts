import { type HTMLAttributes, type ReactNode } from 'react';

export interface IUIDrawerProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'title'
> {
  readonly testId?: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Заголовок панели; он же её доступное имя. */
  readonly title: ReactNode;
  /** Действия в шапке справа. */
  readonly actions?: ReactNode;
}
export type DrawerPanelProps = Omit<IUIDrawerProps, 'onOpenChange' | 'open'> & {
  readonly onClose: () => void;
};
