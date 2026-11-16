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

import {
  type LoginDraft,
  type LoginField,
  validateLogin,
} from '../model/login-form';

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
  const [draft, setDraft] = useState<LoginDraft>({
    email: '',
    password: '',
    remember: true,
  });
  const [errors, setErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [formError, setFormError] = useState(initialError);
  const busy = phase === 'signing-in' || phase === 'redirecting';
  const canSubmit = [draft.email, draft.password].every(
    (value) => value.trim().length > 0,
  );

  const set = <K extends LoginField>(field: K, value: LoginDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || busy) return;
    setFormError('');
    const result = validateLogin(draft);
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
            type='email'
            autoComplete='username'
            placeholder='name@company.com'
            value={draft.email}
            onChange={(event) => set('email', event.target.value)}
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
            type='password'
            autoComplete='current-password'
            placeholder='Введите пароль'
            value={draft.password}
            onChange={(event) => set('password', event.target.value)}
          />
        </UIField>
        <UICheckbox
          label='Запомнить меня'
          checked={draft.remember}
          onCheckedChange={(checked) => set('remember', checked)}
        />
        <UIButton type='submit' size='lg' disabled={!canSubmit} loading={busy}>
          Войти
        </UIButton>
      </fieldset>
    </form>
  );
}
