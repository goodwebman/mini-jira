import type { RouteObject } from 'react-router';

import { ROUTES } from '@/shared/routes';

import { lazyPage } from '../lib/lazy-page';

/** Список досок: поиск, избранное, создание. */
export const boardsRoutes: RouteObject[] = [
  {
    path: ROUTES.BOARDS.path,
    lazy: lazyPage(
      () => import('@/pages/boards'),
      (page) => page.BoardsPage,
    ),
  },
];
