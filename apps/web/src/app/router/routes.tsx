import { Navigate, type RouteObject } from 'react-router';

import { NotFoundPage } from '@/pages/not-found';
import { ROUTES } from '@/shared/routes';

import { RouteErrorBoundary } from './fallback/RouteErrorBoundary';
import { RouteFallback } from './fallback/RouteFallback';
import { GuestOnly } from './guards/GuestOnly';
import { RequireAuth } from './guards/RequireAuth';
import { AppShellRoute } from './layout/AppShellRoute';
import { authRoutes } from './modules/auth.routes';
import { boardRoutes } from './modules/board.routes';
import { boardsRoutes } from './modules/boards.routes';
import { kpiRoutes } from './modules/kpi.routes';
import { myTasksRoutes } from './modules/my-tasks.routes';
import { profileRoutes } from './modules/profile.routes';
import { taskRoutes } from './modules/task.routes';
import { CurrentBoardScope } from './scopes/CurrentBoardScope';

/**
 * Дерево роутов — только композиция. Каждый уровень вложенности отвечает
 * за одно: гард сессии → global scope текущей доски → каркас → модули.
 * Роуты модулей и их скоупы описаны в `modules/`.
 */
export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteFallback />,
    children: [
      { element: <GuestOnly />, children: authRoutes },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <CurrentBoardScope />,
            children: [
              {
                element: <AppShellRoute />,
                children: [
                  {
                    index: true,
                    element: <Navigate replace to={ROUTES.BOARDS.build()} />,
                  },
                  ...boardsRoutes,
                  ...boardRoutes,
                  ...taskRoutes,
                  ...myTasksRoutes,
                  ...kpiRoutes,
                  ...profileRoutes,
                  { path: '*', element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
