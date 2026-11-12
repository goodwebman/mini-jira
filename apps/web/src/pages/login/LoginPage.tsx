import { type FormEvent, useState } from 'react';

import { authService, useAuth } from '@/entities/auth';
import { UIAlert, UIButton, UIField, UIInput } from '@/shared/ui';

import { safeReturnTo } from './return-to';

export function LoginPage() {
  const { phase } = useAuth();
  const [register, setRegister] = useState(false);
  const [error, setError] = useState(() =>
    new URLSearchParams(location.search).has('authError')
      ? 'Не удалось войти через провайдера. Повторите попытку или войдите с паролем.'
      : '',
  );
  const returnTo = safeReturnTo(
    new URLSearchParams(location.search).get('returnTo'),
  );
  const busy = phase !== 'idle';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    if (register && !data.has('acceptedTerms')) {
      setError('Нужно принять условия использования.');
      return;
    }
    const credentials = {
      email: String(data.get('email')),
      password: String(data.get('password')),
    };
    try {
      await authService.login(
        register
          ? {
              kind: 'register',
              ...credentials,
              name: String(data.get('name')),
              acceptedTerms: true,
            }
          : {
              kind: 'password',
              ...credentials,
              remember: data.has('remember'),
            },
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Не удалось войти. Повторите попытку.',
      );
    }
  }
  async function sso(provider: 'google' | 'github') {
    setError('');
    try {
      await authService.login({ sso: provider, returnTo });
    } catch {
      setError('Не удалось открыть страницу входа. Повторите попытку.');
    }
  }
  return (
    <main className='mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 p-6'>
      <h1 className='text-2xl font-semibold'>
        {register ? 'Регистрация' : 'Вход в mini-jira'}
      </h1>
      {error && <UIAlert tone='danger'>{error}</UIAlert>}
      <form onSubmit={submit} className='flex flex-col gap-4'>
        <fieldset disabled={busy} className='flex flex-col gap-4'>
          {register && (
            <UIField key='name' label='Имя'>
              <UIInput
                name='name'
                autoComplete='name'
                required
                maxLength={100}
              />
            </UIField>
          )}
          <UIField key='email' label='Email'>
            <UIInput
              name='email'
              type='email'
              autoComplete='username'
              required
            />
          </UIField>
          <UIField key='password' label='Пароль'>
            <UIInput
              name='password'
              type='password'
              autoComplete={register ? 'new-password' : 'current-password'}
              required
              minLength={register ? 8 : 1}
            />
          </UIField>
          {register ? (
            <label key='terms'>
              <input type='checkbox' name='acceptedTerms' required /> Принимаю
              условия использования
            </label>
          ) : (
            <label key='remember'>
              <input type='checkbox' name='remember' defaultChecked /> Запомнить
              меня
            </label>
          )}
          <UIButton type='submit' loading={busy}>
            {register ? 'Создать аккаунт' : 'Войти'}
          </UIButton>
        </fieldset>
      </form>
      <UIButton
        disabled={busy}
        variant='secondary'
        onClick={() => {
          setRegister(!register);
          setError('');
        }}
      >
        {register ? 'Уже есть аккаунт' : 'Зарегистрироваться'}
      </UIButton>
      <div className='flex gap-3'>
        <UIButton
          disabled={busy}
          variant='secondary'
          onClick={() => void sso('google')}
        >
          Google
        </UIButton>
        <UIButton
          disabled={busy}
          variant='secondary'
          onClick={() => void sso('github')}
        >
          GitHub
        </UIButton>
      </div>
    </main>
  );
}
