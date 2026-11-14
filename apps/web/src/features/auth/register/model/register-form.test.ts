/** Тесткейсы: все ошибки разом, включая повтор пароля, который проверяет только клиент. */
import { describe, expect, it } from 'vitest';

import { validateRegister } from './register-form';

describe('validateRegister', () => {
  it('регистрация: короткий пароль, несовпадение и условия — разом', () => {
    expect(
      validateRegister({
        name: 'Анна',
        email: 'anna@example.com',
        password: '123',
        passwordRepeat: '1234',
        acceptedTerms: false,
      }),
    ).toEqual({
      ok: false,
      errors: {
        password: 'Минимум 8 символов',
        acceptedTerms: 'Нужно принять условия',
        passwordRepeat: 'Пароли не совпадают',
      },
    });
  });
});
