import {
  type ChangePasswordBody,
  changePasswordBodySchema,
} from '@gwmt/contracts';

import { type FieldErrors, issuesToFieldErrors } from '@/shared/lib/form';

export interface PasswordDraft {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly repeat: string;
}

export type PasswordField = keyof PasswordDraft;

export const EMPTY_PASSWORD_DRAFT: PasswordDraft = {
  currentPassword: '',
  newPassword: '',
  repeat: '',
};

export type PasswordDraftResult =
  | { readonly ok: false; readonly errors: FieldErrors<PasswordField> }
  | { readonly ok: true; readonly body: ChangePasswordBody };

/**
 * Аккаунт из OAuth пароля не имеет: текущий не спрашиваем (`hasPassword: false`).
 * Иначе текущий обязателен — без него сервер ответит WRONG_PASSWORD.
 */
export function validatePasswordDraft(
  draft: PasswordDraft,
  hasPassword: boolean,
): PasswordDraftResult {
  const parsed = changePasswordBodySchema.safeParse({
    newPassword: draft.newPassword,
    ...(hasPassword ? { currentPassword: draft.currentPassword } : {}),
  });
  const errors: FieldErrors<PasswordField> = parsed.success
    ? {}
    : issuesToFieldErrors(parsed.error.issues);
  if (hasPassword && draft.currentPassword === '')
    errors.currentPassword = 'Введите текущий пароль';
  if (draft.repeat !== draft.newPassword) errors.repeat = 'Пароли не совпадают';
  if (!parsed.success || errors.currentPassword || errors.repeat)
    return { ok: false, errors };
  return { ok: true, body: parsed.data };
}
