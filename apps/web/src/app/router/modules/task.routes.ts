import type { RouteObject } from 'react-router';

import { ROUTES } from '@/shared/routes';

import { lazyPage } from '../lib/lazy-page';

/** Постоянная ссылка на задачу: ведёт в скоуп её доски. */
export const taskRoutes: RouteObject[] = [
  {
    path: ROUTES.TASK.path,
    lazy: lazyPage(
      () => import('@/pages/task-link'),
      (page) => page.TaskLinkPage,
    ),
  },
];
