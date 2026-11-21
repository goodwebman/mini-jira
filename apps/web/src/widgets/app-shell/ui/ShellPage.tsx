import { type ReactNode, useContext } from 'react';

import { NotificationCenter } from '@/features/notification/inbox';
import { cn } from '@/shared/lib/cn';
import { UIPageHeader } from '@/shared/ui';

import { ShellNotificationsContext } from '../model/shell-notifications-context';
import { ShellTabBar } from './ShellTabBar';

export interface IShellPageProps {
  readonly title: ReactNode;
  readonly caption?: ReactNode;
  readonly onBack?: () => void;
  readonly backDisabled?: boolean;
  /** Заголовок-переключатель с шевроном (название доски открывает список досок). */
  readonly onTitleClick?: () => void;
  readonly actions?: ReactNode;
  /** Плашка над содержимым: например, «Вы гость на этой доске». */
  readonly banner?: ReactNode;
  /** `fixed`: страница сама скроллит части (канбан), `auto` — скроллится целиком. */
  readonly scroll?: 'auto' | 'fixed';
  readonly className?: string;
  readonly children?: ReactNode;
}

/**
 * Рамка страницы внутри каркаса: шапка, вкладки разделов, контент.
 * Страница решает, что показать в шапке; где и как — решает каркас.
 */
export function ShellPage({
  title,
  caption,
  onBack,
  backDisabled,
  onTitleClick,
  actions,
  banner,
  scroll = 'auto',
  className,
  children,
}: IShellPageProps) {
  const notificationsEnabled = useContext(ShellNotificationsContext);
  const paddingX =
    scroll === 'fixed'
      ? 'px-[max(var(--page-padding),calc((100%_-_1760px)/2))]'
      : 'px-[max(var(--page-padding),calc((100%_-_1600px)/2))]';
  return (
    <>
      <UIPageHeader
        className={paddingX}
        title={title}
        caption={caption}
        onBack={onBack}
        backDisabled={backDisabled}
        onTitleClick={onTitleClick}
        actions={
          <>
            {actions}
            {notificationsEnabled && <NotificationCenter />}
          </>
        }
      />
      <ShellTabBar />
      <main
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col gap-section overflow-y-auto py-page scrollbar-thin',
          paddingX,
          scroll === 'fixed' &&
            'w640:[@media(min-height:560px)]:overflow-hidden',
          className,
        )}
      >
        {banner}
        {children}
      </main>
    </>
  );
}
