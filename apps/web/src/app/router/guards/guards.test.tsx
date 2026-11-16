/**
 * Гарды сессии на настоящем дереве роутов.
 *
 * Тесткейсы: сессия не проверена — ни приложения, ни входа; гость уходит на вход с returnTo;
 * вошедший уходит со входа по безопасному returnTo; вход, регистрация, OAuth с отброшенным внешним returnTo.
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { type ApiMock } from '@/shared/lib/testing';

import { auth, signIn } from '../testing/auth-mock';
import {
  renderApp,
  setupRouterTest,
  teardownRouterTest,
  warmUpRoutes,
} from '../testing/router-harness';

vi.mock(
  '@/entities/auth',
  async () => (await import('../testing/auth-mock')).authModule,
);

let api: ApiMock;

beforeAll(() => warmUpRoutes(), 30_000);

beforeEach(() => {
  api = setupRouterTest();
});
afterEach(() => teardownRouterTest(api));

describe('доступ', () => {
  it('пока сессия проверяется, не показывает ни приложение, ни вход', async () => {
    renderApp('/boards/9');
    expect(await screen.findByLabelText('Проверка сессии')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(
      screen.queryByRole('heading', { name: 'Вход в аккаунт' }),
    ).toBeNull();
  });

  it('гость уходит на вход и сохраняет адрес возврата', async () => {
    auth.state.status = 'guest';
    const { router } = renderApp('/boards/1?q=test#task');
    expect(
      await screen.findByRole('heading', { name: 'Вход в аккаунт' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe(
      '?returnTo=%2Fboards%2F1%3Fq%3Dtest%23task',
    );
  });

  it('вошедший уходит со страницы входа по безопасному returnTo', async () => {
    signIn();
    const { router } = renderApp('/login?returnTo=%2Fboards%2F9');
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/boards/9'),
    );
    signIn();
    const external = renderApp('/login?returnTo=https%3A%2F%2Fevil.test');
    await waitFor(() =>
      expect(external.router.state.location.pathname).toBe('/boards'),
    );
  });
});

describe('вход и регистрация', () => {
  beforeEach(() => {
    auth.state.status = 'guest';
  });

  it('вход по паролю и ошибка сервера', async () => {
    auth.login.mockRejectedValueOnce(new Error('Неверный email или пароль'));
    renderApp('/login');
    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith({
        kind: 'password',
        email: 'user@example.com',
        password: 'secret',
        remember: true,
      }),
    );
    expect(
      await screen.findByText('Неверный email или пароль'),
    ).toBeInTheDocument();
  });

  it('кнопка входа недоступна без заполненных обязательных полей', async () => {
    renderApp('/login');
    const button = await screen.findByRole('button', { name: 'Войти' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: '   ' },
    });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(auth.login).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'secret' },
    });
    expect(button).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '' } });
    expect(button).toBeDisabled();
  });

  it('регистрация: повтор пароля и условия проверяются до запроса', async () => {
    renderApp('/login');
    fireEvent.click(
      await screen.findByRole('link', { name: 'Зарегистрироваться' }),
    );
    fireEvent.change(await screen.findByLabelText('Имя и фамилия'), {
      target: { value: 'Тест Тестов' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'password1' },
    });
    fireEvent.change(screen.getByLabelText('Повторите пароль'), {
      target: { value: 'password2' },
    });
    expect(
      screen.getByRole('button', { name: 'Создать аккаунт' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Принимаю условия использования'));
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
    expect(await screen.findByText('Пароли не совпадают')).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Повторите пароль'), {
      target: { value: 'password1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith({
        kind: 'register',
        name: 'Тест Тестов',
        email: 'user@example.com',
        password: 'password1',
        acceptedTerms: true,
      }),
    );
  });

  it.each([
    ['GitHub', 'github'],
    ['Google', 'google'],
  ])(
    'ошибка OAuth видна, %s стартует с безопасным returnTo',
    async (label, sso) => {
      renderApp('/login?authError=failed&returnTo=//evil.test');
      expect(
        await screen.findByText(/Не удалось войти через провайдера/),
      ).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole('button', { name: `Продолжить через ${label}` }),
      );
      await waitFor(() =>
        expect(auth.login).toHaveBeenCalledWith({ sso, returnTo: '/boards' }),
      );
    },
  );
});
