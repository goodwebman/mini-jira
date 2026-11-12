import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '@/App';

const auth = vi.hoisted(() => ({
  state: { status: 'unknown', phase: 'idle', user: null, error: null } as {
    status: string;
    phase: string;
    user: { name: string } | null;
    error: Error | null;
  },
  login: vi.fn(),
  logout: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('@/entities/auth', () => ({
  useAuth: () => auth.state,
  authService: { login: auth.login, logout: auth.logout },
}));
vi.mock('@/kit-gallery/KitGallery', () => ({
  KitGallery: () => <div>Protected content</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  auth.state = { status: 'unknown', phase: 'idle', user: null, error: null };
  auth.login.mockResolvedValue(undefined);
  vi.stubGlobal('location', {
    pathname: '/boards/1',
    search: '?q=test',
    hash: '#task',
    replace: auth.replace,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('application authentication', () => {
  it('hides protected content while restoring the session', () => {
    render(<App />);
    expect(screen.getByLabelText('Проверка сессии')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByText('Protected content')).toBeNull();
    expect(auth.replace).not.toHaveBeenCalled();
  });
  it('redirects guests and preserves their destination', () => {
    auth.state.status = 'guest';
    render(<App />);
    expect(auth.replace).toHaveBeenCalledWith(
      '/login?returnTo=%2Fboards%2F1%3Fq%3Dtest%23task',
    );
    expect(screen.queryByText('Protected content')).toBeNull();
  });
  it('shows protected content after authentication', () => {
    auth.state.status = 'authenticated';
    auth.state.user = { name: 'Test User' };
    render(<App />);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
  it('redirects authenticated users away from login', () => {
    Object.assign(location, {
      pathname: '/login',
      search: '?returnTo=%2Fboards%2F42',
    });
    auth.state.status = 'authenticated';
    render(<App />);
    expect(auth.replace).toHaveBeenCalledWith('/boards/42');
  });
  it('submits password login and displays server errors', async () => {
    Object.assign(location, { pathname: '/login', search: '' });
    auth.state.status = 'guest';
    auth.login.mockRejectedValueOnce(new Error('Неверный пароль'));
    render(<App />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith({
        kind: 'password',
        email: 'user@example.com',
        password: 'password',
        remember: true,
      }),
    );
    expect(await screen.findByText('Неверный пароль')).toBeInTheDocument();
  });
  it('submits registration with accepted terms', async () => {
    Object.assign(location, { pathname: '/login', search: '' });
    auth.state.status = 'guest';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
    expect(
      screen.getByLabelText('Принимаю условия использования'),
    ).not.toBeChecked();
    fireEvent.change(screen.getByLabelText('Имя'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByLabelText('Принимаю условия использования'));
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith({
        kind: 'register',
        name: 'Test User',
        email: 'user@example.com',
        password: 'password',
        acceptedTerms: true,
      }),
    );
  });
  it.each(['Google', 'GitHub'])(
    'shows OAuth errors and starts %s with a safe destination',
    async (provider) => {
      Object.assign(location, {
        pathname: '/login',
        search: '?authError=failed&returnTo=//evil.test',
      });
      auth.state.status = 'guest';
      render(<App />);
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Не удалось войти через провайдера',
      );
      fireEvent.click(screen.getByRole('button', { name: provider }));
      await waitFor(() =>
        expect(auth.login).toHaveBeenCalledWith({
          sso: provider.toLowerCase(),
          returnTo: '/boards',
        }),
      );
    },
  );
});
