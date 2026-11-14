import { type FormEvent, useState } from 'react';

import type { Me } from '@gwmt/contracts';

import { TimezoneSelect } from '@/entities/profile';
import { readApiError } from '@/shared/api';
import { UIAlert, UIButton, UIField, UIInput, useToast } from '@/shared/ui';

import {
  type ProfileDraft,
  type ProfileField,
  profileDraftFrom,
  validateProfileDraft,
} from '../model/profile-draft';
import { useUpdateProfile } from '../model/use-update-profile';

const FIELDS: readonly {
  readonly field: Exclude<ProfileField, 'timezone'>;
  readonly label: string;
  readonly type: 'email' | 'text';
  readonly autoComplete: string;
}[] = [
  { field: 'name', label: 'Имя и фамилия', type: 'text', autoComplete: 'name' },
  { field: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  {
    field: 'job',
    label: 'Должность',
    type: 'text',
    autoComplete: 'organization-title',
  },
];

/** Личные данные: отправляются только изменённые поля, ошибки — под полями. */
export function ProfileForm({ me }: { readonly me: Me }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<ProfileDraft>(() => profileDraftFrom(me));
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>(
    {},
  );
  const [formError, setFormError] = useState('');

  const mutation = useUpdateProfile();

  const set = <K extends ProfileField>(field: K, value: ProfileDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const result = validateProfileDraft(draft, me);
    if (!result.ok) setErrors(result.errors);
    else if (Object.keys(result.body).length === 0) toast('Изменений нет');
    else
      mutation.mutate(result.body, {
        onSuccess: () => toast('Профиль сохранён'),
        onError: (cause) => {
          const info = readApiError(cause);
          if (info.code === 'EMAIL_TAKEN') setErrors({ email: info.message });
          else if (Object.keys(info.fields).length > 0) setErrors(info.fields);
          else setFormError(info.message);
        },
      });
  };

  return (
    <form noValidate onSubmit={submit} className='flex flex-col gap-4'>
      {formError && <UIAlert tone='danger'>{formError}</UIAlert>}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        {FIELDS.map(({ field, label, type, autoComplete }) => (
          <UIField key={field} label={label} error={errors[field]}>
            <UIInput
              type={type}
              autoComplete={autoComplete}
              value={draft[field]}
              onChange={(event) => set(field, event.target.value)}
            />
          </UIField>
        ))}
        <UIField label='Часовой пояс'>
          <TimezoneSelect
            value={draft.timezone}
            onValueChange={(timezone) => set('timezone', timezone)}
          />
        </UIField>
      </div>
      <div>
        <UIButton type='submit' loading={mutation.isPending}>
          Сохранить
        </UIButton>
      </div>
    </form>
  );
}
