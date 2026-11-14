import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from '@/entities/auth';
import { loginRedirect } from '@/shared/routes';

import { SessionPending } from './SessionPending';

/**
 * Защищённая зона. Гость уходит на вход с адресом возврата; пока профиль
 * не загружен, экран ждёт — ниже по дереву пользователь всегда есть.
 */
export function RequireAuth() {
  const { status, user, error } = useAuth();
  const location = useLocation();
  if (status === 'guest')
    return <Navigate replace to={loginRedirect(location)} />;
  if (status !== 'authenticated' || !user)
    return <SessionPending offline={error !== null} />;
  return <Outlet />;
}
