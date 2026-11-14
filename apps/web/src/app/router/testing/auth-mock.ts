import { vi } from 'vitest';

import { makeMe } from '@/shared/lib/testing';

interface AuthStateMock {
  status: string;
  phase: string;
  user: null | ReturnType<typeof makeMe>;
  error: Error | null;
}

/**
 * Подмена сессии для интеграционных тестов роутера. Подключается в тесте так:
 * `vi.mock('@/entities/auth', async () => (await import('../testing/auth-mock')).authModule)`
 * — фабрика и тест получают один и тот же экземпляр модуля.
 */
export const auth = {
  state: {
    status: 'unknown',
    phase: 'idle',
    user: null,
    error: null,
  } as AuthStateMock,
  login: vi.fn<(input: unknown) => Promise<void>>(),
  logout: vi.fn<() => Promise<void>>(),
};

export const authModule = {
  useAuth: () => auth.state,
  useSessionUser: () => auth.state.user,
  authService: {
    login: (input: unknown) => auth.login(input),
    logout: () => auth.logout(),
  },
};

export function resetAuth(): void {
  auth.state = { status: 'unknown', phase: 'idle', user: null, error: null };
  auth.login.mockReset().mockResolvedValue(undefined);
  auth.logout.mockReset().mockResolvedValue(undefined);
}

export function signIn(): void {
  auth.state = {
    status: 'authenticated',
    phase: 'idle',
    user: makeMe(),
    error: null,
  };
}
