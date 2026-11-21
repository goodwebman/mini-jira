import { Link, useLocation } from 'react-router';

import { useSessionUser } from '@/entities/auth';
import { ROUTES } from '@/shared/routes';
import { UISideNav } from '@/shared/ui';
import { UIIcons } from '@/shared/ui/icons';

import { isPlainClick } from '../lib/is-plain-click';
import { useAppShell } from '../model/app-shell.di';
import {
  useShellSection,
  useShellSummary,
} from '../model/use-shell-navigation';

/** Боковое меню со сводкой по доске, задачам и KPI. */
export function ShellSideNav() {
  const user = useSessionUser();
  const { pathname } = useLocation();
  const section = useShellSection();
  const nav = useShellSummary();
  const shell = useAppShell();

  return (
    <UISideNav
      footer={
        <UISideNav.Profile
          name={user.name}
          caption='Профиль'
          active={section === 'profile'}
          render={<Link to={ROUTES.PROFILE.build()} />}
        />
      }
    >
      <UISideNav.Tile
        active={section === 'boards'}
        icon={<UIIcons.Board />}
        label='Доски'
        value={nav.boards.value}
        sub={nav.boards.sub}
        render={
          <Link
            to={ROUTES.BOARDS.build()}
            onClick={(event) => {
              // Ctrl/⌘-клик открывает список в новой вкладке.
              if (pathname === ROUTES.BOARDS.path || !isPlainClick(event))
                return;
              event.preventDefault();
              shell.openBoardsSwitcher();
            }}
          />
        }
      >
        {nav.boards.columns.length > 0 && (
          <UISideNav.BoardViz columns={nav.boards.columns} />
        )}
      </UISideNav.Tile>
      <UISideNav.Tile
        active={section === 'tasks'}
        icon={<UIIcons.Tasks />}
        label='Мои задачи'
        value={nav.tasks.value}
        sub={nav.tasks.sub}
        render={<Link to={ROUTES.MY_TASKS.build()} />}
      >
        {nav.tasks.next.length > 0 && (
          <UISideNav.TasksViz items={nav.tasks.next} />
        )}
      </UISideNav.Tile>
      <UISideNav.Tile
        active={section === 'kpi'}
        icon={<UIIcons.Chart />}
        label='KPI'
        value={nav.kpi.value}
        sub={nav.kpi.sub}
        render={<Link to={nav.kpi.href} />}
      >
        <UISideNav.SparkViz values={nav.kpi.remaining} />
      </UISideNav.Tile>
    </UISideNav>
  );
}
