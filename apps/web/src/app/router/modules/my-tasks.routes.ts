import type { RouteObject } from 'react-router';

import { ROUTES } from '@/shared/routes';

import { lazyPage } from '../lib/lazy-page';

/** Свои задачи со всех досок: фильтры и страница в адресе. */
export const myTasksRoutes: RouteObject[] = [
  {
    path: ROUTES.MY_TASKS.path,
    lazy: lazyPage(
      () => import('@/pages/my-tasks'),
      (page) => page.MyTasksPage,
    ),
  },
];
