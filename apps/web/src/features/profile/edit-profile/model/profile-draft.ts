import {
  type Me,
  type Timezone,
  type UpdateMeBody,
  updateMeBodySchema,
} from '@gwmt/contracts';

import { type FieldErrors, issuesToFieldErrors } from '@/shared/lib/form';

export interface ProfileDraft {
  readonly name: string;
  readonly email: string;
  readonly job: string;
  readonly timezone: Timezone;
}

export type ProfileField = keyof ProfileDraft;

export function profileDraftFrom(me: Me): ProfileDraft {
  return { name: me.name, email: me.email, job: me.job, timezone: me.timezone };
}

export type ProfileDraftResult =
  | { readonly ok: false; readonly errors: FieldErrors<ProfileField> }
  | { readonly ok: true; readonly body: UpdateMeBody };

/**
 * Отправляются только изменённые поля: PATCH не перетирает то, что пользователь
 * поменял в соседней вкладке. Без изменений — пустое тело, запрос не нужен.
 */
export function validateProfileDraft(
  draft: ProfileDraft,
  me: Me,
): ProfileDraftResult {
  const parsed = updateMeBodySchema.safeParse(draft);
  if (!parsed.success)
    return { ok: false, errors: issuesToFieldErrors(parsed.error.issues) };
  const changed = Object.fromEntries(
    Object.entries(parsed.data).filter(
      ([field, value]) => me[field as ProfileField] !== value,
    ),
  ) as UpdateMeBody;
  return { ok: true, body: changed };
}
