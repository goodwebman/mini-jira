// @vitest-environment node
import type { Me } from '@gwmt/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi, fetchMe } from './auth-api';

const context = { signal: new AbortController().signal };

const ME: Me = {
  id: 'u1',
  name: 'Анна',
  email: 'anna@example.com',
  job: '',
  timezone: 'Europe/Moscow',
  colorIndex: 1,
  hasPassword: true,
  hasGithub: false,
  hasGoogle: false,
};

const AUTH_RESPONSE = {
  accessToken: 'header.payload.signature',
  accessTokenExpiresAt: '2026-11-08T09:03:41.078Z',
  user: ME,
};

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

const apiError = (code: string, message: string, fields?: Record<string, string>) => ({
  error: { code, message, requestId: 'r1', ...(fields ? { fields } : {}) },
});

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_AUTH_SALT', 'build-salt');
  vi.stubEnv('VITE_APP_VERSION', '1.2.3');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? [];
  return { url, init, headers: new Headers(init?.headers) };
};

describe('вход и регистрация', () => {
  const login = {
    kind: 'password',
    email: ' Anna@Example.com',
    password: 'secret-password',
    remember: true,
  } as const;

  it('вход идёт на /auth/login, служебное поле kind в тело не попадает', async () => {
    fetchMock.mockResolvedValue(json(AUTH_RESPONSE));
    const tokens = await authApi.login(login, context);
    const { url, init } = lastCall();
    expect(url).toBe('/api/v1/auth/login');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      email: login.email,
      password: login.password,
      remember: true,
    });
    expect(tokens).toEqual({ accessToken: AUTH_RESPONSE.accessToken, user: ME });
  });

  it('подпись считается от email ровно как в теле, в формате сервера', async () => {
    fetchMock.mockResolvedValue(json(AUTH_RESPONSE));
    await authApi.login(login, context);
    const { headers } = lastCall();
    const timestamp = headers.get('fastify-timestamp') ?? '';
    expect(headers.get('fastify-version')).toBe('1.2.3');
    expect(Math.abs(Date.now() - Number(timestamp))).toBeLessThan(5_000);
    expect(headers.get('fastify-token')).toBe(await sha256Hex(`build-salt${login.email}${timestamp}`));
  });

  it('регистрация идёт на /auth/register', async () => {
    fetchMock.mockResolvedValue(json(AUTH_RESPONSE, { status: 201 }));
    await authApi.login(
      {
        kind: 'register',
        name: 'Анна',
        email: 'a@b.c',
        password: 'password',
        acceptedTerms: true,
      },
      context,
    );
    expect(lastCall().url).toBe('/api/v1/auth/register');
  });

  it('неверный пароль: код и текст сервера', async () => {
    fetchMock.mockResolvedValue(
      json(apiError('INVALID_CREDENTIALS', 'Неверный email или пароль'), { status: 401 }),
    );
    await expect(authApi.login(login, context)).rejects.toMatchObject({
      code: 'unauthorized',
      serverCode: 'INVALID_CREDENTIALS',
      message: 'Неверный email или пароль',
    });
  });

  it('ошибки полей доступны форме', async () => {
    fetchMock.mockResolvedValue(
      json(apiError('VALIDATION_ERROR', 'Проверьте поля', { email: 'Введите корректный email' }), {
        status: 422,
      }),
    );
    await expect(authApi.login(login, context)).rejects.toMatchObject({
      code: 'bad_request',
      details: { email: 'Введите корректный email' },
    });
  });

  it('блокировка входа: Retry-After виден', async () => {
    fetchMock.mockResolvedValue(
      json(apiError('TOO_MANY_ATTEMPTS', 'Подождите'), {
        status: 429,
        headers: { 'Retry-After': '120' },
      }),
    );
    await expect(authApi.login(login, context)).rejects.toMatchObject({
      code: 'rate_limited',
      retryAfterMs: 120_000,
    });
  });

  it('нет соли в сборке: понятная ошибка, запрос не уходит', async () => {
    vi.stubEnv('VITE_AUTH_SALT', '');
    await expect(authApi.login(login, context)).rejects.toMatchObject({ code: 'misconfigured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ответ не по контракту не превращается в сессию', async () => {
    fetchMock.mockResolvedValue(json({ accessToken: 'x' }));
    await expect(authApi.login(login, context)).rejects.toMatchObject({ code: 'bad_response' });
  });

  it('не JSON (страница прокси) тоже', async () => {
    fetchMock.mockResolvedValue(new Response('<html>'));
    await expect(authApi.login(login, context)).rejects.toMatchObject({ code: 'bad_response' });
  });
});

describe('refresh', () => {
  it('POST без тела: refresh-токен приезжает в cookie сам', async () => {
    fetchMock.mockResolvedValue(json(AUTH_RESPONSE));
    await expect(
      authApi.refresh({ ...context, accessToken: null, refreshToken: null }),
    ).resolves.toMatchObject({ accessToken: AUTH_RESPONSE.accessToken });
    expect(lastCall().url).toBe('/api/v1/auth/refresh');
    expect(lastCall().init?.body).toBeUndefined();
  });

  it.each(['REFRESH_MISSING', 'REFRESH_INVALID', 'REFRESH_EXPIRED', 'REFRESH_REUSED'])(
    '%s: сессии больше нет',
    async (code) => {
      fetchMock.mockResolvedValue(json(apiError(code, 'x'), { status: 401 }));
      await expect(
        authApi.refresh({ ...context, accessToken: null, refreshToken: null }),
      ).rejects.toMatchObject({ code: 'unauthorized', serverCode: code });
    },
  );

  it('403 от проверки Origin не считается концом сессии', async () => {
    fetchMock.mockResolvedValue(json(apiError('FORBIDDEN_ORIGIN', 'x'), { status: 403 }));
    await expect(
      authApi.refresh({ ...context, accessToken: null, refreshToken: null }),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });
});

describe('logout', () => {
  it('переживает уход со страницы', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await authApi.logout({ ...context, accessToken: null, refreshToken: null });
    expect(lastCall().url).toBe('/api/v1/auth/logout');
    expect(lastCall().init?.keepalive).toBe(true);
  });
});

describe('fetchMe', () => {
  it('ходит авторизованным fetch', async () => {
    const authFetch = vi.fn(async () => json(ME));
    await expect(fetchMe({ fetch: authFetch, ...context })).resolves.toEqual(ME);
    expect(authFetch).toHaveBeenCalledWith('/api/v1/me', { signal: context.signal });
  });

  it('ответ не по контракту отвергается', async () => {
    const authFetch = vi.fn(async () => json({ id: 'u1' }));
    await expect(fetchMe({ fetch: authFetch, ...context })).rejects.toMatchObject({
      code: 'bad_response',
    });
  });

  it('401 превращается в ошибку', async () => {
    const authFetch = vi.fn(async () => json(apiError('ACCESS_TOKEN_EXPIRED', 'x'), { status: 401 }));
    await expect(fetchMe({ fetch: authFetch, ...context })).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });
});
