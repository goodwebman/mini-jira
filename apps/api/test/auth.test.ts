import { SignJWT } from 'jose';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { authSessions, users } from '../src/db/schema.js';
import { hashPassword } from '../src/lib/password.js';
import { createTestApp, json, saltHeaders, signedPost, testEnv, type TestApp } from './helpers.js';

const APP_URL = testEnv.APP_URL;

function cookiesOf(res: Response) {
  return res.headers.getSetCookie();
}

function refreshCookieOf(res: Response) {
  return cookiesOf(res).find((value) => value.startsWith('gwmt_refresh='));
}

const tokenValue = (cookie: string | undefined) => cookie?.split(';')[0]?.split('=')[1] ?? '';

describe('авторизация', () => {
  let t: TestApp;
  let counter = 0;
  const email = () => `auth${(counter += 1)}@example.com`;

  const post = (path: string, body?: unknown, headers: Record<string, string> = {}) =>
    signedPost(t, path, body, headers);

  const register = (address = email()) =>
    post('/auth/register', {
      name: 'Анна Смирнова',
      email: address,
      password: 'password',
      acceptedTerms: true,
    });

  const refreshWith = (token: string, headers: Record<string, string> = {}) =>
    post('/auth/refresh', undefined, { Cookie: `gwmt_refresh=${token}`, ...headers });

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(() => t.close());
  afterEach(() => vi.unstubAllGlobals());

  describe('регистрация', () => {
    it('отдаёт 201, AuthResponse и cookie с нужными атрибутами', async () => {
      const address = email();
      const res = await register(address);
      expect(res.status).toBe(201);

      const body = await json(res);
      expect(body.user).toMatchObject({ email: address, hasPassword: true, hasGithub: false });
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.accessTokenExpiresAt).toBe(
        new Date(t.clock.current.getTime() + 15 * 60_000).toISOString(),
      );

      const cookie = refreshCookieOf(res);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/api/v1/auth');
      expect(cookie).not.toContain('Secure');
    });

    it('занятый email даёт 409', async () => {
      const address = email();
      await register(address);
      const res = await register(address.toUpperCase());
      expect(res.status).toBe(409);
      expect((await json(res)).error.code).toBe('EMAIL_TAKEN');
    });

    it.each([
      ['name', { name: ' ' }, 'Введите имя и фамилию'],
      ['email', { email: 'nope' }, 'Введите корректный email'],
      ['password', { password: '123' }, 'Минимум 8 символов'],
      ['acceptedTerms', { acceptedTerms: false }, 'Нужно принять условия'],
    ])('невалидное поле %s даёт 422 с текстом', async (field, patch, text) => {
      const res = await post('/auth/register', {
        name: 'Имя',
        email: email(),
        password: 'password',
        acceptedTerms: true,
        ...patch,
      });
      expect(res.status).toBe(422);
      const body = await json(res);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.fields[field]).toBe(text);
    });
  });

  it('битый JSON даёт 400', async () => {
    const res = await t.app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...saltHeaders('', t.clock.current) },
      body: '{not json',
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe('BAD_REQUEST');
  });

  describe('вход', () => {
    it('неверный пароль и неизвестный email дают одинаковый ответ', async () => {
      const address = email();
      await register(address);
      const wrong = await post('/auth/login', { email: address, password: 'bad-pass', remember: true });
      const unknown = await post('/auth/login', {
        email: 'ghost@example.com',
        password: 'bad-pass',
        remember: true,
      });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      const a = (await json(wrong)).error;
      const b = (await json(unknown)).error;
      expect(a.code).toBe('INVALID_CREDENTIALS');
      expect({ ...a, requestId: '' }).toEqual({ ...b, requestId: '' });
    });

    it('пустой пароль даёт текст из контракта', async () => {
      const res = await post('/auth/login', { email: email(), password: '', remember: false });
      expect(res.status).toBe(422);
      expect((await json(res)).error.fields.password).toBe('Введите пароль');
    });

    it('remember: false даёт cookie без Max-Age, true даёт 30 дней', async () => {
      const address = email();
      await register(address);
      const session = await post('/auth/login', { email: address, password: 'password', remember: false });
      expect(refreshCookieOf(session)).not.toContain('Max-Age');
      const remembered = await post('/auth/login', { email: address, password: 'password', remember: true });
      expect(refreshCookieOf(remembered)).toContain(`Max-Age=${30 * 86400}`);
    });

    it('11-я неудача подряд даёт 429 с Retry-After', async () => {
      const address = email();
      for (let attempt = 1; attempt <= 10; attempt += 1) {
        const res = await post('/auth/login', { email: address, password: 'bad-pass', remember: true });
        expect(res.status).toBe(401);
      }
      const blocked = await post('/auth/login', { email: address, password: 'bad-pass', remember: true });
      expect(blocked.status).toBe(429);
      expect((await json(blocked)).error.code).toBe('TOO_MANY_ATTEMPTS');
      expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
    });

    it('после окна счётчик начинается заново', async () => {
      const address = email();
      for (let attempt = 1; attempt <= 10; attempt += 1) {
        await post('/auth/login', { email: address, password: 'bad-pass', remember: true });
      }
      t.advance(15 * 60_000 + 1000);
      const res = await post('/auth/login', { email: address, password: 'bad-pass', remember: true });
      expect(res.status).toBe(401);
    });
  });

  describe('токен доступа', () => {
    const protectedPath = '/api/v1/me';
    const call = (authorization?: string) =>
      t.app.request(protectedPath, {
        headers: authorization ? { Authorization: authorization } : {},
      });

    it('без заголовка ACCESS_TOKEN_MISSING', async () => {
      const res = await call();
      expect(res.status).toBe(401);
      expect((await json(res)).error.code).toBe('ACCESS_TOKEN_MISSING');
    });

    it('истёкший ACCESS_TOKEN_EXPIRED', async () => {
      const { accessToken } = await json(await register());
      t.advance(15 * 60_000 + 1000);
      const res = await call(`Bearer ${accessToken}`);
      expect(res.status).toBe(401);
      expect((await json(res)).error.code).toBe('ACCESS_TOKEN_EXPIRED');
    });

    it('изменённый ACCESS_TOKEN_INVALID', async () => {
      const { accessToken } = await json(await register());
      const res = await call(`Bearer ${accessToken}x`);
      expect((await json(res)).error.code).toBe('ACCESS_TOKEN_INVALID');
    });

    it('alg: none даёт ACCESS_TOKEN_INVALID', async () => {
      const { accessToken } = await json(await register());
      const [, payload] = (accessToken as string).split('.');
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const res = await call(`Bearer ${header}.${payload}.`);
      expect((await json(res)).error.code).toBe('ACCESS_TOKEN_INVALID');
    });

    it('другой алгоритм даёт ACCESS_TOKEN_INVALID', async () => {
      const key = new TextEncoder().encode(testEnv.JWT_ACCESS_SECRET.padEnd(64, 'x'));
      const token = await new SignJWT({ sid: crypto.randomUUID() })
        .setProtectedHeader({ alg: 'HS512' })
        .setSubject(crypto.randomUUID())
        .setIssuer('gwmt')
        .setAudience('gwmt-web')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(key);
      expect((await json(await call(`Bearer ${token}`))).error.code).toBe('ACCESS_TOKEN_INVALID');
    });
  });

  describe('refresh', () => {
    const cookieFrom = async (res: Response) => tokenValue(refreshCookieOf(res));

    it('без cookie REFRESH_MISSING, с мусором REFRESH_INVALID', async () => {
      expect((await json(await post('/auth/refresh'))).error.code).toBe('REFRESH_MISSING');
      expect((await json(await refreshWith('garbage'))).error.code).toBe('REFRESH_INVALID');
    });

    it('выдаёт новый токен, и старая cookie перестаёт быть основной', async () => {
      const first = await cookieFrom(await register());
      const res = await refreshWith(first);
      expect(res.status).toBe(200);
      const second = tokenValue(refreshCookieOf(res));
      expect(second).not.toBe('');
      expect(second).not.toBe(first);
      t.advance(31_000);
      expect((await refreshWith(second)).status).toBe(200);
    });

    it('два параллельных refresh: оба 200, ровно один Set-Cookie', async () => {
      const token = await cookieFrom(await register());
      const [a, b] = await Promise.all([refreshWith(token), refreshWith(token)]);
      expect([a.status, b.status]).toEqual([200, 200]);
      expect([refreshCookieOf(a), refreshCookieOf(b)].filter(Boolean)).toHaveLength(1);
      expect((await json(a)).accessToken).toEqual(expect.any(String));
      expect((await json(b)).accessToken).toEqual(expect.any(String));
    });

    it('старая cookie через 31 секунду: REFRESH_REUSED, и самая новая не работает', async () => {
      const first = await cookieFrom(await register());
      const newest = tokenValue(refreshCookieOf(await refreshWith(first)));

      t.advance(31_000);
      const stolen = await refreshWith(first);
      expect(stolen.status).toBe(401);
      expect((await json(stolen)).error.code).toBe('REFRESH_REUSED');
      expect(refreshCookieOf(stolen)).toContain('Max-Age=0');

      const after = await refreshWith(newest);
      expect(after.status).toBe(401);
      expect((await json(after)).error.code).toBe('REFRESH_EXPIRED');
    });

    it('срок скользящий', async () => {
      const first = await cookieFrom(
        await post('/auth/login', {
          email: (await (async () => {
            const address = email();
            await register(address);
            return address;
          })()),
          password: 'password',
          remember: false,
        }),
      );
      t.advance(20 * 3600_000);
      const res = await refreshWith(first);
      expect(res.status).toBe(200);
      t.advance(20 * 3600_000);
      expect((await refreshWith(tokenValue(refreshCookieOf(res)))).status).toBe(200);
    });

    it('истёкшая сессия даёт REFRESH_EXPIRED', async () => {
      const address = email();
      await register(address);
      const token = await cookieFrom(
        await post('/auth/login', { email: address, password: 'password', remember: false }),
      );
      t.advance(86_400_000 + 1000);
      expect((await json(await refreshWith(token))).error.code).toBe('REFRESH_EXPIRED');
    });

    it('чужой Origin даёт 403, свой и отсутствующий проходят', async () => {
      const token = await cookieFrom(await register());
      const foreign = await refreshWith(token, { Origin: 'https://evil.example' });
      expect(foreign.status).toBe(403);
      expect((await json(foreign)).error.code).toBe('FORBIDDEN_ORIGIN');
      expect((await refreshWith(token, { Origin: APP_URL })).status).toBe(200);
    });
  });

  describe('logout', () => {
    it('очищает cookie, и после него refresh отдаёт 401', async () => {
      const token = tokenValue(refreshCookieOf(await register()));
      const res = await post('/auth/logout', undefined, { Cookie: `gwmt_refresh=${token}` });
      expect(res.status).toBe(204);
      expect(refreshCookieOf(res)).toContain('Max-Age=0');
      expect((await refreshWith(token)).status).toBe(401);
    });

    it('без cookie тоже 204, с чужим Origin 403', async () => {
      expect((await post('/auth/logout')).status).toBe(204);
      expect((await post('/auth/logout', undefined, { Origin: 'https://evil.example' })).status).toBe(403);
    });
  });

  describe('GitHub', () => {
    const startFlow = async (next = '/boards') => {
      const res = await t.app.request(`/api/v1/auth/github/start?next=${encodeURIComponent(next)}`);
      const location = new URL(res.headers.get('Location')!);
      const cookie = cookiesOf(res).find((value) => value.startsWith('gwmt_oauth_state='))!;
      return { res, location, cookie, state: location.searchParams.get('state')! };
    };

    const stubGithub = (identity: {
      id: number;
      login?: string;
      name?: string | null;
      emails?: { email: string; primary: boolean; verified: boolean }[];
    }) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
          if (url.includes('/login/oauth/access_token')) {
            return Response.json({ access_token: 'gh-token' });
          }
          if (url.endsWith('/user/emails')) return Response.json(identity.emails ?? []);
          return Response.json({
            id: identity.id,
            login: identity.login ?? 'octocat',
            name: identity.name ?? null,
          });
        }),
      );
    };

    const callback = (state: string, cookie: string, extra = 'code=abc') =>
      t.app.request(`/api/v1/auth/github/callback?${extra}&state=${state}`, {
        headers: { Cookie: cookie.split(';')[0]! },
      });

    it('start кладёт state в Lax-cookie и уводит на GitHub', async () => {
      const { res, location, cookie, state } = await startFlow();
      expect(res.status).toBe(302);
      expect(location.origin).toBe('https://github.com');
      expect(location.searchParams.get('scope')).toBe('read:user user:email');
      expect(state).toBeTruthy();
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/api/v1/auth/github');
      expect(cookie).toContain('Max-Age=600');
    });

    it('неверный state ведёт на authError', async () => {
      const { cookie } = await startFlow();
      const res = await callback('wrong-state', cookie);
      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe(`${APP_URL}/login?authError=github_state_mismatch`);
    });

    it('отказ пользователя ведёт на github_denied', async () => {
      const { cookie, state } = await startFlow();
      const res = await callback(state, cookie, 'error=access_denied');
      expect(res.headers.get('Location')).toBe(`${APP_URL}/login?authError=github_denied`);
    });

    it('нет подтверждённого email ведёт на github_no_verified_email', async () => {
      stubGithub({ id: 100, emails: [{ email: 'x@example.com', primary: true, verified: false }] });
      const { cookie, state } = await startFlow();
      const res = await callback(state, cookie);
      expect(res.headers.get('Location')).toBe(`${APP_URL}/login?authError=github_no_verified_email`);
    });

    it('сбой GitHub ведёт на github_failed', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
      const { cookie, state } = await startFlow();
      const res = await callback(state, cookie);
      expect(res.headers.get('Location')).toBe(`${APP_URL}/login?authError=github_failed`);
    });

    it('создаёт нового пользователя, ставит cookie, токена нет в URL', async () => {
      stubGithub({
        id: 101,
        login: 'newbie',
        name: null,
        emails: [{ email: 'newbie@example.com', primary: true, verified: true }],
      });
      const { cookie, state } = await startFlow('/boards/9');
      const res = await callback(state, cookie);
      expect(res.status).toBe(302);
      const location = res.headers.get('Location')!;
      expect(location).toBe(`${APP_URL}/boards/9`);
      expect(location).not.toMatch(/token/i);
      expect(refreshCookieOf(res)).toContain('SameSite=Strict');

      const [user] = await t.db.select().from(users).where(eq(users.githubId, 101));
      expect(user?.name).toBe('newbie');
      expect(user?.passwordHash).toBeNull();

      const access = await json(await refreshWith(tokenValue(refreshCookieOf(res))));
      expect(access.user).toMatchObject({ hasGithub: true, hasPassword: false });
    });

    it('внешний next игнорируется', async () => {
      stubGithub({
        id: 102,
        emails: [{ email: 'next@example.com', primary: true, verified: true }],
      });
      const { cookie, state } = await startFlow('//evil.example/phish');
      const res = await callback(state, cookie);
      expect(res.headers.get('Location')).toBe(`${APP_URL}/boards`);
    });

    it('привязка по email обнуляет пароль и отзывает сессии', async () => {
      const address = email();
      const registered = await register(address);
      const oldCookie = tokenValue(refreshCookieOf(registered));
      const userId = (await json(registered)).user.id as string;

      stubGithub({ id: 103, emails: [{ email: address, primary: true, verified: true }] });
      const { cookie, state } = await startFlow();
      const res = await callback(state, cookie);
      expect(res.status).toBe(302);

      const [user] = await t.db.select().from(users).where(eq(users.id, userId));
      expect(user?.passwordHash).toBeNull();
      expect(user?.githubId).toBe(103);

      const old = await refreshWith(oldCookie);
      expect((await json(old)).error.code).toBe('REFRESH_EXPIRED');
      expect((await refreshWith(tokenValue(refreshCookieOf(res)))).status).toBe(200);
    });

    it('повторный вход находит пользователя по github_id', async () => {
      stubGithub({ id: 104, emails: [{ email: 'again@example.com', primary: true, verified: true }] });
      for (let round = 0; round < 2; round += 1) {
        const { cookie, state } = await startFlow();
        await callback(state, cookie);
      }
      const rows = await t.db.select().from(users).where(eq(users.githubId, 104));
      expect(rows).toHaveLength(1);
    });
  });

  describe('пароль хранится как scrypt', () => {
    it('параметры лежат в строке хэша', async () => {
      const hash = await hashPassword('password');
      expect(hash).toMatch(/^scrypt\$65536\$8\$2\$/);
    });

    it('сессия пишется с user agent', async () => {
      const res = await post(
        '/auth/register',
        { name: 'Агент', email: email(), password: 'password', acceptedTerms: true },
        { 'User-Agent': 'vitest' },
      );
      const userId = (await json(res)).user.id as string;
      const [session] = await t.db.select().from(authSessions).where(eq(authSessions.userId, userId));
      expect(session?.userAgent).toBe('vitest');
      expect(session?.remember).toBe(true);
    });
  });
});
