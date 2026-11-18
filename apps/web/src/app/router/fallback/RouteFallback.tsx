import { useLocation } from 'react-router';

import { UIPageHeader, UISkeleton } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';
import { AppShellSkeleton, ShellPageSkeleton } from '@/widgets/app-shell';
import { BoardListSkeleton } from '@/widgets/board-list';
import { MembersSkeleton } from '@/widgets/board-members-list';
import { BoardSkeleton } from '@/widgets/kanban-board';
import { KpiSkeleton } from '@/widgets/kpi-dashboard';
import { MyTasksSkeleton } from '@/widgets/my-tasks-list';
import { ProfileSkeleton } from '@/widgets/profile-overview';
import { TaskSkeleton } from '@/widgets/task-detail';

/**
 * Первый экран, пока роутер догружает чанк страницы. Без него на медленной
 * сети пользователь смотрит на белый лист.
 */
export function RouteFallback() {
  const { pathname } = useLocation();
  if (pathname === '/login' || pathname === '/register')
    return (
      <main
        aria-busy='true'
        aria-label='Загрузка'
        className='flex min-h-dvh items-center justify-center p-page'
      >
        <div className='flex w-full max-w-[400px] flex-col gap-5'>
          <UISkeleton className='h-10 w-32' />
          <UISkeleton className='h-8 w-3/4' />
          {['a', 'b', 'c'].map((key) => (
            <UISkeleton key={key} className='h-control w-full' />
          ))}
        </div>
      </main>
    );
  const isTask = /\/tasks\//.test(pathname);
  const isMembers = pathname.endsWith('/members');
  const isBoard = /^\/boards\/\d+\/?$/.test(pathname);
  let title: string | undefined = 'Доски';
  let content = <BoardListSkeleton />;
  if (isTask) {
    title = undefined;
    content = <TaskSkeleton />;
  } else if (isMembers) {
    title = 'Участники доски';
    content = <MembersSkeleton />;
  } else if (isBoard) {
    title = undefined;
    content = <BoardSkeleton />;
  } else if (pathname === '/profile') {
    title = 'Профиль';
    content = <ProfileSkeleton />;
  } else if (pathname === '/kpi') {
    title = 'KPI';
    content = <KpiSkeleton />;
  } else if (pathname === '/my-tasks') {
    title = 'Мои задачи';
    content = <MyTasksSkeleton />;
  }
  return (
    <AppShellSkeleton>
      <ShellPageSkeleton
        title={title}
        backDisabled={isTask}
        scroll={isBoard ? 'fixed' : 'auto'}
        actions={
          isBoard ? (
            <UIPageHeader.ActionSkeleton
              icon={<UIIcons.Plus />}
              label='Создать задачу'
            />
          ) : undefined
        }
      >
        {content}
      </ShellPageSkeleton>
    </AppShellSkeleton>
  );
}
