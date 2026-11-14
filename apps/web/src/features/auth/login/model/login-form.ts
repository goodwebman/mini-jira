import { type LoginBody, loginBodySchema } from '@gwmt/contracts';

import { type FormResult, issuesToFieldErrors } from '@/shared/lib/form';

export interface LoginDraft {
  readonly email: string;
  readonly password: string;
  readonly remember: boolean;
}

export type LoginField = keyof LoginDraft;

export function validateLogin(
  draft: LoginDraft,
): FormResult<LoginBody, LoginField> {
  const parsed = loginBodySchema.safeParse(draft);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, errors: issuesToFieldErrors(parsed.error.issues) };
}
