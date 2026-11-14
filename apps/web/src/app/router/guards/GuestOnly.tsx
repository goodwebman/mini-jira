import { Navigate, Outlet, useSearchParams } from 'react-router';

import { useAuth } from '@/entities/auth';
import { safeReturnTo } from '@/shared/routes';

import { SessionPending } from './SessionPending';

/** Вход и регистрация: вошедшего пользователя возвращаем туда, откуда он пришёл. */
export function GuestOnly() {
  const { status, error } = useAuth();
  const [params] = useSearchParams();
  if (status === 'authenticated')
    return <Navigate replace to={safeReturnTo(params.get('returnTo'))} />;
  if (status !== 'guest') return <SessionPending offline={error !== null} />;
  return <Outlet />;
}
