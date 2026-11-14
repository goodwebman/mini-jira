import { Link, useSearchParams } from 'react-router';

import { OAuthButtons } from '@/features/auth/oauth';
import { RegisterForm } from '@/features/auth/register';
import { ROUTES, safeReturnTo } from '@/shared/routes';
import { UILink } from '@/shared/ui';

import { AuthLayout } from './AuthLayout';

export function RegisterPage() {
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));
  return (
    <AuthLayout
      title='Регистрация'
      subtitle='Создайте аккаунт за минуту'
      form={<RegisterForm />}
      alternative={<OAuthButtons returnTo={returnTo} />}
      footer={
        <>
          Уже есть аккаунт?{' '}
          <UILink
            render={
              <Link
                to={{
                  pathname: ROUTES.LOGIN.build(),
                  search: params.toString(),
                }}
              />
            }
          >
            Войти
          </UILink>
        </>
      }
    />
  );
}
