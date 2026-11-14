import type { RouteObject } from 'react-router';

import { ROUTES } from '@/shared/routes';

import { lazyPage } from '../lib/lazy-page';

/** Личные данные, пароль, сводка по своим задачам. */
export const profileRoutes: RouteObject[] = [
  {
    path: ROUTES.PROFILE.path,
    lazy: lazyPage(
      () => import('@/pages/profile'),
      (page) => page.ProfilePage,
    ),
  },
];
