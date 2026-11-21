import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authService } from '@/entities/auth';
import { UIToastProvider } from '@/shared/ui';

import { LoginForm } from './LoginForm';

vi.mock('@/entities/auth', () => ({
  authService: { login: vi.fn() },
  useAuth: () => ({ phase: 'idle' }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    render(
      <UIToastProvider>
        <LoginForm />
      </UIToastProvider>,
    );
  });

  it('разблокирует вход, когда браузер показывает сохранённые данные', () => {
    const email = screen.getByLabelText<HTMLInputElement>('Email');
    const password = screen.getByLabelText<HTMLInputElement>('Пароль');
    const button = screen.getByRole('button', { name: 'Войти' });
    vi.spyOn(email, 'matches').mockReturnValue(true);
    vi.spyOn(password, 'matches').mockReturnValue(true);
    // В jsdom нет AnimationEvent, поэтому React слушает событие с префиксом.
    fireEvent(password, new Event('webkitAnimationStart', { bubbles: true }));

    expect(button).toBeEnabled();
    email.value = 'anna@example.com';
    password.value = 'secret';
    fireEvent.click(button);

    expect(authService.login).toHaveBeenCalledExactlyOnceWith({
      kind: 'password',
      email: 'anna@example.com',
      password: 'secret',
      remember: true,
    });
  });
});
