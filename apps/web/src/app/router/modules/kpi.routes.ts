import type { RouteObject } from 'react-router';

import { ROUTES } from '@/shared/routes';

import { lazyPage } from '../lib/lazy-page';

/** Метрики спринта: графики грузятся отдельным чанком только здесь. */
export const kpiRoutes: RouteObject[] = [
  {
    path: ROUTES.KPI.path,
    lazy: lazyPage(
      () => import('@/pages/kpi'),
      (page) => page.KpiPage,
    ),
  },
];
