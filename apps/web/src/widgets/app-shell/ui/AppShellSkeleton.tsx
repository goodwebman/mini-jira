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
      className='flex h-dvh flex-col bg-background text-foreground'
    >
      <div className='flex min-h-0 flex-1'>
        <UISideNav
          footer={
            <div className='flex min-h-[48px] flex-none items-center justify-center gap-2 px-2 py-1 lg:justify-start'>
              <UISkeleton className='size-avatar-md shrink-0 rounded-full' />
              <div className='hidden min-w-0 flex-col lg:flex'>
                <UISkeleton className='h-[1.43em] w-28' />
                <UISkeleton className='h-[1.34em] w-20 text-caption' />
              </div>
            </div>
          }
        >
          <UISideNav.Tile
            active={section === 'boards'}
            tone='blue'
            icon={<UIIcons.Board />}
            label='Доски'
            render={<Link to={ROUTES.BOARDS.build()} />}
          >
            <UISkeleton className='h-12 w-full' />
          </UISideNav.Tile>
          <UISideNav.Tile
            active={section === 'tasks'}
            tone='violet'
            icon={<UIIcons.Tasks />}
            label='Мои задачи'
            render={<Link to={ROUTES.MY_TASKS.build()} />}
          >
            <UISkeleton className='h-12 w-full' />
          </UISideNav.Tile>
          <UISideNav.Tile
            active={section === 'kpi'}
            tone='green'
            icon={<UIIcons.Chart />}
            label='KPI'
            render={<Link to={ROUTES.KPI.build()} />}
          >
            <UISkeleton className='h-12 w-full' />
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
