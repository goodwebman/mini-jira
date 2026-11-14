import { useEffect } from 'react';

import { isRouteErrorResponse, useRouteError } from 'react-router';

import { monitoring } from '@/app/monitoring';
import { ErrorBlock } from '@/app/ui/ErrorBlock';

/**
 * Ошибка роутера: упал ленивый импорт страницы (новый деплой удалил старый чанк)
 * или рендер вне границ страниц. Ошибку видит Sentry, пользователь — экран
 * с перезагрузкой: после неё загрузятся актуальные чанки.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  useEffect(() => {
    if (isRouteErrorResponse(error) && error.status === 404) return;
    monitoring.captureException(error, { tags: { source: 'router' } });
  }, [error]);
  return <ErrorBlock />;
}
