import { type RegisterBody, registerBodySchema } from '@gwmt/contracts';

import {
  type FieldErrors,
  type FormResult,
  issuesToFieldErrors,
} from '@/shared/lib/form';

export interface RegisterDraft {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly passwordRepeat: string;
  readonly acceptedTerms: boolean;
}

export type RegisterField = keyof RegisterDraft;

/** Повтор пароля проверяется только на клиенте: сервер получает один пароль. */
export function validateRegister(
  draft: RegisterDraft,
): FormResult<RegisterBody, RegisterField> {
  const parsed = registerBodySchema.safeParse({
    name: draft.name,
    email: draft.email,
    password: draft.password,
    acceptedTerms: draft.acceptedTerms,
  });
  const errors: FieldErrors<RegisterField> = parsed.success
    ? {}
    : issuesToFieldErrors(parsed.error.issues);
  if (draft.passwordRepeat !== draft.password)
    errors.passwordRepeat = 'Пароли не совпадают';
  if (!parsed.success || errors.passwordRepeat) return { ok: false, errors };
  return { ok: true, value: parsed.data };
}
