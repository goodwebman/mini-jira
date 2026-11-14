/** Тесткейсы: аккаунт с паролем требует текущий; OAuth-аккаунт — нет, и текущий не отправляется; несовпадение и короткий пароль. */
import { describe, expect, it } from 'vitest';

import { EMPTY_PASSWORD_DRAFT, validatePasswordDraft } from './password-draft';

describe('смена пароля', () => {
  it('аккаунт с паролем требует текущий', () => {
    expect(
      validatePasswordDraft(
        {
          ...EMPTY_PASSWORD_DRAFT,
          newPassword: 'password1',
          repeat: 'password1',
        },
        true,
      ),
    ).toEqual({
      ok: false,
      errors: { currentPassword: 'Введите текущий пароль' },
    });
  });

  it('OAuth-аккаунт без пароля — текущий не нужен и не отправляется', () => {
    expect(
      validatePasswordDraft(
        {
          currentPassword: 'ignored',
          newPassword: 'password1',
          repeat: 'password1',
        },
        false,
      ),
    ).toEqual({ ok: true, body: { newPassword: 'password1' } });
  });

  it('несовпадение и короткий пароль', () => {
    const result = validatePasswordDraft(
      { currentPassword: 'old', newPassword: 'short', repeat: 'other' },
      true,
    );
    expect(result.ok ? null : result.errors).toEqual({
      newPassword: 'Минимум 8 символов',
      repeat: 'Пароли не совпадают',
    });
  });
});
