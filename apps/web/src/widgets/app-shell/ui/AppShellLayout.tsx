import { type ReactNode, useMemo, useState } from 'react';

import { Link, Outlet, useLocation } from 'react-router';

import { useSessionUser } from '@/entities/auth';
import { CreateBoardDialog } from '@/features/board/create-board';
import { useNotificationSync } from '@/features/notification/inbox';
import { ROUTES } from '@/shared/routes';
import { UIDrawer, UIIconButton, buttonVariants } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

import { type AppShellApi, AppShellInjector } from '../model/app-shell.di';
import { ShellNotificationsContext } from '../model/shell-notifications-context';
import { ShellBottomNav } from './ShellBottomNav';
import { ShellSideNav } from './ShellSideNav';

export interface IAppShellLayoutProps {
  /**
   * Содержимое панели «Доски задач». Каркас не знает, как устроен список досок:
   * его подставляет слой выше (IoC), иначе виджет зависел бы от соседнего виджета.
   */
  readonly renderBoardsPanel: (api: {
    readonly close: () => void;
  }) => ReactNode;
}

/**
 * Каркас приложения — элемент роута с `<Outlet />`.
 * Боковое меню, вкладки и нижнее меню переключаются CSS-брейкпоинтами кита.
 */
export function AppShellLayout({ renderBoardsPanel }: IAppShellLayoutProps) {
  useNotificationSync();
  const user = useSessionUser();
  const location = useLocation();
  // Панель привязана к адресу, на котором её открыли: любой переход её закрывает
  const [panelAt, setPanelAt] = useState<null | string>(null);
  const [creating, setCreating] = useState(false);
  const panelOpen = panelAt === location.key;
  const close = () => setPanelAt(null);

  const api = useMemo<AppShellApi>(
    () => ({
      openBoardsSwitcher: () => setPanelAt(location.key),
    }),
    [location.key],
  );

  return (
    <ShellNotificationsContext value={true}>
      <AppShellInjector value={api}>
        <div className='mx-auto flex h-dvh w-full max-w-[2080px] flex-col bg-background text-foreground'>
          <div className='flex min-h-0 flex-1'>
            <ShellSideNav />
            <div className='relative flex min-h-0 min-w-0 flex-1 flex-col'>
              <Outlet />
              <UIDrawer
                open={panelOpen}
                onOpenChange={(open) => {
                  if (!open) close();
                }}
                title='Доски задач'
                actions={
                  <>
                    <Link
                      to={ROUTES.BOARDS.build()}
                      className={buttonVariants({ variant: 'secondary' })}
                    >
                      Показать все
                    </Link>
                    <UIIconButton
                      label='Создать доску'
                      variant='primary'
                      onClick={() => {
                        close();
                        setCreating(true);
                      }}
                    >
                      <UIIcons.Plus />
                    </UIIconButton>
                  </>
                }
              >
                {renderBoardsPanel({ close })}
              </UIDrawer>
            </div>
          </div>
          <ShellBottomNav />
        </div>
        <CreateBoardDialog
          open={creating}
          onOpenChange={setCreating}
          currentUser={user}
        />
      </AppShellInjector>
    </ShellNotificationsContext>
  );
}
