import { type FormEvent, useState } from 'react';

import { authService, useAuth } from '@/entities/auth';
import { UIAlert, UIButton, UICheckbox, UIField, UIInput } from '@/shared/ui';

import {
  type RegisterDraft,
  type RegisterField,
  validateRegister,
} from '../model/register-form';

const EMPTY: RegisterDraft = {
  name: '',
  email: '',
  password: '',
  passwordRepeat: '',
  acceptedTerms: false,
};

export function RegisterForm() {
  const { phase } = useAuth();
  const [draft, setDraft] = useState<RegisterDraft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<RegisterField, string>>>(
    {},
  );
  const [formError, setFormError] = useState('');
  const busy = phase === 'signing-in' || phase === 'redirecting';

  const set = <K extends RegisterField>(field: K, value: RegisterDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const result = validateRegister(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    try {
      await authService.login({ kind: 'register', ...result.value });
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? cause.message
          : 'Не удалось создать аккаунт. Повторите попытку.',
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
        <UIField label='Имя и фамилия' error={errors.name}>
          <UIInput
            autoComplete='name'
            placeholder='Анна Смирнова'
            maxLength={100}
            value={draft.name}
            onChange={(event) => set('name', event.target.value)}
          />
        </UIField>
        <UIField label='Email' error={errors.email}>
          <UIInput
            type='email'
            autoComplete='email'
            placeholder='name@company.com'
            value={draft.email}
            onChange={(event) => set('email', event.target.value)}
          />
        </UIField>
        <UIField label='Пароль' error={errors.password}>
          <UIInput
            type='password'
            autoComplete='new-password'
            placeholder='Минимум 8 символов'
            value={draft.password}
            onChange={(event) => set('password', event.target.value)}
          />
        </UIField>
        <UIField label='Повторите пароль' error={errors.passwordRepeat}>
          <UIInput
            type='password'
            autoComplete='new-password'
            placeholder='Ещё раз пароль'
            value={draft.passwordRepeat}
            onChange={(event) => set('passwordRepeat', event.target.value)}
          />
        </UIField>
        <UIField error={errors.acceptedTerms}>
          <UICheckbox
            label='Принимаю условия использования'
            checked={draft.acceptedTerms}
            onCheckedChange={(checked) => set('acceptedTerms', checked)}
          />
        </UIField>
        <UIButton type='submit' size='lg' loading={busy}>
          Создать аккаунт
        </UIButton>
      </fieldset>
    </form>
  );
}
