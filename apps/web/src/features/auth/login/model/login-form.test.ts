/** Тесткейсы: email нормализуется схемой контракта; пустые поля — ошибки по полям. */
import { describe, expect, it } from 'vitest';

import { validateLogin } from './login-form';

describe('validateLogin', () => {
  it('вход: email нормализуется схемой контракта', () => {
    expect(
      validateLogin({
        email: ' anna@example.com ',
        password: 'x',
        remember: false,
      }),
    ).toEqual({
      ok: true,
      value: { email: 'anna@example.com', password: 'x', remember: false },
    });
  });

  it('пустая форма — ошибки email и пароля', () => {
    expect(validateLogin({ email: '', password: '', remember: true })).toEqual({
      ok: false,
      errors: { email: 'Введите корректный email', password: 'Введите пароль' },
    });
  });
});
