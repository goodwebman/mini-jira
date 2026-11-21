import { type FormEvent, useState } from 'react';

import { authService, useAuth } from '@/entities/auth';
import {
  UIAlert,
  UIButton,
  UICheckbox,
  UIField,
  UIInput,
  UILink,
  useToast,
} from '@/shared/ui';

import { type LoginField, validateLogin } from '../model/login-form';

/**
 * Вход по паролю. Подпись запроса, refresh-cookie и гонки вкладок — забота
 * `authService`; форма только валидирует поля и показывает ошибку.
 */
export function LoginForm({
  initialError = '',
}: {
  readonly initialError?: string;
}) {
  const { phase } = useAuth();
  const { toast } = useToast();
  const [canSubmit, setCanSubmit] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [formError, setFormError] = useState(initialError);
  const busy = phase === 'signing-in' || phase === 'redirecting';

  const updateCanSubmit = (form: HTMLFormElement) => {
    setCanSubmit(
      ['email', 'password'].every((name) => {
        const input = form.elements.namedItem(name);
        return (
          input instanceof HTMLInputElement &&
          (input.value.trim().length > 0 || input.matches(':autofill'))
        );
      }),
    );
  };

  const clearError = (field: LoginField) => {
    setErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    // Менеджер паролей может заполнить поля без события change.
    const form = new FormData(event.currentTarget);
    setFormError('');
    const result = validateLogin({
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      remember: form.has('remember'),
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    try {
      await authService.login({ kind: 'password', ...result.value });
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : 'Не удалось войти. Повторите попытку.',
      );
    }
  };

  return (
    <form
      noValidate
      onChange={(event) => updateCanSubmit(event.currentTarget)}
      onAnimationStart={(event) => updateCanSubmit(event.currentTarget)}
      onSubmit={(event) => void submit(event)}
      className='flex flex-col gap-3'
    >
      {formError && <UIAlert tone='danger'>{formError}</UIAlert>}
      <fieldset
        disabled={busy}
        className='m-0 flex flex-col gap-3 border-0 p-0'
      >
        <UIField label='Email' error={errors.email}>
          <UIInput
            className='autofill:animate-autofill autofill:scale-autofill-text'
            name='email'
            type='email'
            autoComplete='username'
            placeholder='name@company.com'
            onChange={() => clearError('email')}
          />
        </UIField>
        <UIField
          label='Пароль'
          error={errors.password}
          labelAside={
            <UILink
              href='#forgot'
              onClick={(event) => {
                event.preventDefault();
                toast(
                  'Восстановление пароля пока недоступно: обратитесь к администратору',
                );
              }}
            >
              Забыли пароль?
            </UILink>
          }
        >
          <UIInput
            className='autofill:animate-autofill autofill:scale-autofill-text'
            name='password'
            type='password'
            autoComplete='current-password'
            placeholder='Введите пароль'
            onChange={() => clearError('password')}
          />
        </UIField>
        <UICheckbox name='remember' label='Запомнить меня' defaultChecked />
        <UIButton type='submit' size='lg' disabled={!canSubmit} loading={busy}>
          Войти
        </UIButton>
      </fieldset>
    </form>
  );
}
