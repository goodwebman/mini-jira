import type { ReactNode } from 'react';

import { Link } from 'react-router';

import { ROUTES } from '@/shared/routes';
import { UISideNav, UISkeleton } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

import { useShellSection } from '../model/use-shell-navigation';
import { ShellBottomNav } from './ShellBottomNav';

export function AppShellSkeleton({
  children,
}: {
  readonly children: ReactNode;
}) {
  const section = useShellSection();
  return (
    <div
      aria-busy='true'
      aria-label='Загрузка приложения'
      className='mx-auto flex h-dvh w-full max-w-[2080px] flex-col bg-background text-foreground'
    >
      <div className='flex min-h-0 flex-1'>
        <UISideNav
          footer={
            <div className='flex min-h-12 flex-none flex-col items-center justify-center gap-1 p-2 w1280:flex-row w1280:justify-start w1280:gap-2'>
              <UISkeleton className='size-avatar-md shrink-0 rounded-full' />
              <div className='flex min-w-0 flex-col'>
                <UISkeleton className='hidden h-[1.43em] w-28 w1280:block' />
                <UISkeleton className='h-[1.34em] w-12 text-caption w1280:w-20' />
              </div>
            </div>
          }
        >
          <UISideNav.Tile
            active={section === 'boards'}
            icon={<UIIcons.Board />}
            label='Доски'
            render={<Link to={ROUTES.BOARDS.build()} />}
          >
            <UISkeleton className='h-20 w-full' />
          </UISideNav.Tile>
          <UISideNav.Tile
            active={section === 'tasks'}
            icon={<UIIcons.Tasks />}
            label='Мои задачи'
            render={<Link to={ROUTES.MY_TASKS.build()} />}
          >
            <UISkeleton className='h-8 w-full' />
          </UISideNav.Tile>
          <UISideNav.Tile
            active={section === 'kpi'}
            icon={<UIIcons.Chart />}
            label='KPI'
            render={<Link to={ROUTES.KPI.build()} />}
          >
            <UISkeleton className='h-8 w-full' />
          </UISideNav.Tile>
        </UISideNav>
        <div className='relative flex min-h-0 min-w-0 flex-1 flex-col'>
          {children}
        </div>
      </div>
      <ShellBottomNav />
    </div>
  );
}
