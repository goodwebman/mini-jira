import { Link, useSearchParams } from 'react-router';

import { LoginForm } from '@/features/auth/login';
import { OAuthButtons } from '@/features/auth/oauth';
import { ROUTES, safeReturnTo } from '@/shared/routes';
import { UILink } from '@/shared/ui';

import { AuthLayout } from './AuthLayout';

const OAUTH_ERROR =
  'Не удалось войти через провайдера. Повторите попытку или войдите с паролем.';

/** Вход. После успеха гард сам вернёт пользователя на `returnTo`. */
export function LoginPage() {
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));
  return (
    <AuthLayout
      title='Вход в аккаунт'
      subtitle='Войдите, чтобы открыть свои доски и задачи'
      form={
        <LoginForm initialError={params.has('authError') ? OAUTH_ERROR : ''} />
      }
      alternative={<OAuthButtons returnTo={returnTo} />}
      footer={
        <>
          Нет аккаунта?{' '}
          <UILink
            render={
              <Link
                to={{
                  pathname: ROUTES.REGISTER.build(),
                  search: params.toString(),
                }}
              />
            }
          >
            Зарегистрироваться
          </UILink>
        </>
      }
    />
  );
}
