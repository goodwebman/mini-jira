import type { RouteObject } from 'react-router';

import { ROUTES } from '@/shared/routes';

import { lazyPage } from '../lib/lazy-page';

/** Вход и регистрация: доступны только гостю (см. `GuestOnly`). */
export const authRoutes: RouteObject[] = [
  {
    path: ROUTES.LOGIN.path,
    lazy: lazyPage(
      () => import('@/pages/auth'),
      (page) => page.LoginPage,
    ),
  },
  {
    path: ROUTES.REGISTER.path,
    lazy: lazyPage(
      () => import('@/pages/auth'),
      (page) => page.RegisterPage,
    ),
  },
];
