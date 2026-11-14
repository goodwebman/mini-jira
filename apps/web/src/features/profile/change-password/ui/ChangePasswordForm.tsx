import { type FormEvent, useState } from 'react';

import { readApiError } from '@/shared/api';
import { UIAlert, UIButton, UIField, UIInput, useToast } from '@/shared/ui';

import {
  EMPTY_PASSWORD_DRAFT,
  type PasswordDraft,
  type PasswordField,
  validatePasswordDraft,
} from '../model/password-draft';
import { useChangePassword } from '../model/use-change-password';

/** Смена пароля. Сервер оставляет текущую сессию и закрывает остальные. */
export function ChangePasswordForm({
  hasPassword,
}: {
  readonly hasPassword: boolean;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<PasswordDraft>(EMPTY_PASSWORD_DRAFT);
  const [errors, setErrors] = useState<Partial<Record<PasswordField, string>>>(
    {},
  );
  const [formError, setFormError] = useState('');

  const mutation = useChangePassword();

  const set = (field: PasswordField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const result = validatePasswordDraft(draft, hasPassword);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    mutation.mutate(result.body, {
      onSuccess: () => {
        setDraft(EMPTY_PASSWORD_DRAFT);
        toast('Пароль изменён');
      },
      onError: (cause) => {
        const info = readApiError(cause);
        if (info.code === 'WRONG_PASSWORD')
          setErrors({ currentPassword: 'Неверный текущий пароль' });
        else if (Object.keys(info.fields).length > 0) setErrors(info.fields);
        else setFormError(info.message);
      },
    });
  };

  return (
    <form noValidate onSubmit={submit} className='flex flex-col gap-4'>
      {formError && <UIAlert tone='danger'>{formError}</UIAlert>}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        {hasPassword && (
          <UIField
            label='Текущий пароль'
            error={errors.currentPassword}
            className='sm:col-span-2'
          >
            <UIInput
              type='password'
              autoComplete='current-password'
              value={draft.currentPassword}
              onChange={(event) => set('currentPassword', event.target.value)}
            />
          </UIField>
        )}
        <UIField label='Новый пароль' error={errors.newPassword}>
          <UIInput
            type='password'
            autoComplete='new-password'
            value={draft.newPassword}
            onChange={(event) => set('newPassword', event.target.value)}
          />
        </UIField>
        <UIField label='Повторите пароль' error={errors.repeat}>
          <UIInput
            type='password'
            autoComplete='new-password'
            value={draft.repeat}
            onChange={(event) => set('repeat', event.target.value)}
          />
        </UIField>
      </div>
      <div>
        <UIButton
          type='submit'
          variant='secondary'
          loading={mutation.isPending}
        >
          Сменить пароль
        </UIButton>
      </div>
    </form>
  );
}
