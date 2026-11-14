import type { RouteObject } from 'react-router';

import { ROUTES } from '@/shared/routes';

import { lazyPage } from '../lib/lazy-page';
import { BoardScope } from '../scopes/BoardScope';

/**
 * Модуль доски — cross-module scope: канбан, участники и задача делят один
 * стор рабочего пространства, который создаёт `BoardScope` вокруг `<Outlet />`.
 * Соседние модули («Мои задачи», KPI) к нему доступа не имеют.
 */
export const boardRoutes: RouteObject[] = [
  {
    path: ROUTES.BOARD.path,
    element: <BoardScope />,
    children: [
      {
        index: true,
        lazy: lazyPage(
          () => import('@/pages/board'),
          (page) => page.BoardPage,
        ),
      },
      {
        path: ROUTES.BOARD_MEMBERS.path,
        lazy: lazyPage(
          () => import('@/pages/board-members'),
          (page) => page.BoardMembersPage,
        ),
      },
      {
        path: ROUTES.BOARD_TASK.path,
        lazy: lazyPage(
          () => import('@/pages/task'),
          (page) => page.TaskPage,
        ),
      },
    ],
  },
];
