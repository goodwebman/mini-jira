import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { authSessions, users } from '../src/db/schema.js';
import { createTestApp, createUser, json, signedPost, testEnv, type TestApp } from './helpers.js';

const APP_URL = testEnv.APP_URL;
const CALLBACK_URL = `${APP_URL}/api/v1/auth/google/callback`;

const refreshCookieOf = (res: Response) =>
  res.headers.getSetCookie().find((value) => value.startsWith('gwmt_refresh='));

const tokenValue = (cookie: string | undefined) => cookie?.split(';')[0]?.split('=')[1] ?? '';

interface Profile {
  sub?: string;
  name?: string;
  email?: string;
  email_verified?: boolean | string;
  hd?: string;
}

describe('вход через Google', () => {
  let t: TestApp;
  let counter = 0;

  const unique = () => (counter += 1);
  const gmail = () => `user${unique()}@gmail.com`;
  const sub = () => `google-sub-${unique()}`;

  const post = (path: string, body?: unknown, headers: Record<string, string> = {}) =>
    signedPost(t, path, body, headers);

  const refreshWith = (token: string) =>
    post('/auth/refresh', undefined, { Cookie: `gwmt_refresh=${token}` });

  const startFlow = async (next = '/boards') => {
    const res = await t.app.request(`/api/v1/auth/google/start?next=${encodeURIComponent(next)}`);
    const location = new URL(res.headers.get('Location')!);
    const cookie = res.headers.getSetCookie().find((value) => value.startsWith('gwmt_oauth_state='))!;
    return { res, location, cookie, state: location.searchParams.get('state')! };
  };

  const callback = (state: string, cookie: string, extra = 'code=abc') =>
    t.app.request(`/api/v1/auth/google/callback?${extra}&state=${state}`, {
      headers: { Cookie: cookie.split(';')[0]! },
    });

  const stubGoogle = (profile: Profile) => {
    const stub = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url === 'https://oauth2.googleapis.com/token') {
        return Response.json({ access_token: 'google-access-token', id_token: 'unused' });
      }
      return Response.json(profile);
    });
    vi.stubGlobal('fetch', stub);
    return stub;
  };

  const signIn = async (profile: Profile, next?: string) => {
    stubGoogle(profile);
    const { cookie, state } = await startFlow(next);
    return callback(state, cookie);
  };

  const failureOf = (failure: string) => `${APP_URL}/login?authError=google_${failure}`;

  const registerWithPassword = async (email: string) => {
    const res = await post('/auth/register', {
      name: 'С паролем',
      email,
      password: 'password',
      acceptedTerms: true,
    });
    expect(res.status).toBe(201);
    return {
      cookie: tokenValue(refreshCookieOf(res)),
      userId: (await json(res)).user.id as string,
    };
  };

  const findUser = async (id: string) => {
    const [user] = await t.db.select().from(users).where(eq(users.id, id));
    return user;
  };

  const usersWithEmail = (email: string) => t.db.select().from(users).where(eq(users.email, email));

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(() => t.close());
  afterEach(() => vi.unstubAllGlobals());

  describe('начало входа', () => {
    it('уводит на Google с нужными параметрами', async () => {
      const { res, location, state } = await startFlow();
      expect(res.status).toBe(302);
      expect(`${location.origin}${location.pathname}`).toBe('https://accounts.google.com/o/oauth2/v2/auth');

      const params = location.searchParams;
      expect(params.get('client_id')).toBe(testEnv.GOOGLE_CLIENT_ID);
      expect(params.get('redirect_uri')).toBe(CALLBACK_URL);
      expect(params.get('response_type')).toBe('code');
      expect(params.get('scope')).toBe('openid email profile');
      expect(params.get('prompt')).toBe('select_account');
      expect(state).toBeTruthy();
    });

    it('кладёт state в Lax-cookie на свой путь', async () => {
      const { cookie } = await startFlow();
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/api/v1/auth/google');
      expect(cookie).toContain('Max-Age=600');
      expect(cookie).not.toContain('Secure');
    });

    it('доступен без токена', async () => {
      expect((await t.app.request('/api/v1/auth/google/start')).status).toBe(302);
    });
  });

  describe('ошибки', () => {
    it('неверный state', async () => {
      const { cookie } = await startFlow();
      const res = await callback('wrong-state', cookie);
      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe(failureOf('state_mismatch'));
    });

    it('нет cookie со state', async () => {
      const res = await t.app.request('/api/v1/auth/google/callback?code=abc&state=anything');
      expect(res.headers.get('Location')).toBe(failureOf('state_mismatch'));
    });

    it('state проверяется раньше ошибки провайдера', async () => {
      const { cookie } = await startFlow();
      const res = await callback('wrong-state', cookie, 'error=access_denied');
      expect(res.headers.get('Location')).toBe(failureOf('state_mismatch'));
    });

    it('отказ пользователя', async () => {
      const { cookie, state } = await startFlow();
      const res = await callback(state, cookie, 'error=access_denied');
      expect(res.headers.get('Location')).toBe(failureOf('denied'));
    });

    it('нет кода', async () => {
      const { cookie, state } = await startFlow();
      const res = await callback(state, cookie, 'unused=1');
      expect(res.headers.get('Location')).toBe(failureOf('denied'));
    });

    it('email не подтверждён', async () => {
      const res = await signIn({ sub: sub(), email: gmail(), email_verified: false });
      expect(res.headers.get('Location')).toBe(failureOf('no_verified_email'));
    });

    it('email отсутствует', async () => {
      const res = await signIn({ sub: sub(), email_verified: true });
      expect(res.headers.get('Location')).toBe(failureOf('no_verified_email'));
    });

    it('Google вернул 500', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
      const { cookie, state } = await startFlow();
      expect((await callback(state, cookie)).headers.get('Location')).toBe(failureOf('failed'));
    });

    it('в ответе на обмен кода нет токена', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'invalid_grant' })));
      const { cookie, state } = await startFlow();
      expect((await callback(state, cookie)).headers.get('Location')).toBe(failureOf('failed'));
    });

    it('в профиле нет sub', async () => {
      const res = await signIn({ email: gmail(), email_verified: true });
      expect(res.headers.get('Location')).toBe(failureOf('failed'));
    });

    it('сетевая ошибка', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
      const { cookie, state } = await startFlow();
      expect((await callback(state, cookie)).headers.get('Location')).toBe(failureOf('failed'));
    });

    it('при ошибке cookie сессии не ставится, а state очищается', async () => {
      const { cookie, state } = await startFlow();
      const res = await callback(state, cookie, 'error=access_denied');
      expect(refreshCookieOf(res)).toBeUndefined();
      const cleared = res.headers.getSetCookie().find((value) => value.startsWith('gwmt_oauth_state='));
      expect(cleared).toContain('Max-Age=0');
      expect(cleared).toContain('Path=/api/v1/auth/google');
    });
  });

  describe('обмен кода', () => {
    it('шлёт форму с нужными полями и читает профиль с токеном', async () => {
      const stub = stubGoogle({ sub: sub(), name: 'Имя', email: gmail(), email_verified: true });
      const { cookie, state } = await startFlow();
      await callback(state, cookie, 'code=the-code');

      const [tokenCall, profileCall] = stub.mock.calls;
      expect(tokenCall?.[0]).toBe('https://oauth2.googleapis.com/token');
      expect(tokenCall?.[1]?.method).toBe('POST');
      expect((tokenCall?.[1]?.headers as Record<string, string>)['Content-Type']).toBe(
        'application/x-www-form-urlencoded',
      );
      const form = tokenCall?.[1]?.body as URLSearchParams;
      expect(Object.fromEntries(form)).toEqual({
        code: 'the-code',
        client_id: testEnv.GOOGLE_CLIENT_ID,
        client_secret: testEnv.GOOGLE_CLIENT_SECRET,
        redirect_uri: CALLBACK_URL,
        grant_type: 'authorization_code',
      });

      expect(profileCall?.[0]).toBe('https://openidconnect.googleapis.com/v1/userinfo');
      expect((profileCall?.[1]?.headers as Record<string, string>).Authorization).toBe(
        'Bearer google-access-token',
      );
    });
  });

  describe('новый пользователь', () => {
    it('создаётся, получает cookie, токена нет в URL', async () => {
      const email = gmail();
      const id = sub();
      const res = await signIn({ sub: id, name: 'Анна Гуглова', email, email_verified: true }, '/boards/9');

      expect(res.status).toBe(302);
      const location = res.headers.get('Location')!;
      expect(location).toBe(`${APP_URL}/boards/9`);
      expect(location).not.toMatch(/token/i);
      expect(refreshCookieOf(res)).toContain('SameSite=Strict');
      expect(refreshCookieOf(res)).toContain(`Max-Age=${30 * 86400}`);

      const [user] = await t.db.select().from(users).where(eq(users.googleId, id));
      expect(user).toMatchObject({ name: 'Анна Гуглова', email, passwordHash: null, githubId: null });
      expect(user?.termsAcceptedAt).toBeInstanceOf(Date);

      const access = await json(await refreshWith(tokenValue(refreshCookieOf(res))));
      expect(access.user).toMatchObject({ hasGoogle: true, hasGithub: false, hasPassword: false });
    });

    it('без имени берёт начало email', async () => {
      const id = sub();
      await signIn({ sub: id, email: 'firstname.last@gmail.com', email_verified: true });
      const [user] = await t.db.select().from(users).where(eq(users.googleId, id));
      expect(user?.name).toBe('firstname.last');
    });

    it('длинное имя обрезается до лимита контракта', async () => {
      const id = sub();
      await signIn({ sub: id, name: 'я'.repeat(300), email: gmail(), email_verified: true });
      const [user] = await t.db.select().from(users).where(eq(users.googleId, id));
      expect(user?.name).toHaveLength(100);
    });

    it('email_verified строкой тоже принимается', async () => {
      const res = await signIn({ sub: sub(), email: gmail(), email_verified: 'true' });
      expect(res.headers.get('Location')).toBe(`${APP_URL}/boards`);
    });

    it('внешний next игнорируется', async () => {
      const res = await signIn({ sub: sub(), email: gmail(), email_verified: true }, '//evil.example/phish');
      expect(res.headers.get('Location')).toBe(`${APP_URL}/boards`);
    });

    it('адрес вне Gmail и Workspace подходит для нового аккаунта', async () => {
      const email = `outside${unique()}@example.org`;
      const res = await signIn({ sub: sub(), email, email_verified: true });
      expect(res.headers.get('Location')).toBe(`${APP_URL}/boards`);
      expect(await usersWithEmail(email)).toHaveLength(1);
    });
  });

  describe('повторный вход', () => {
    it('находит пользователя по sub, дубля нет', async () => {
      const id = sub();
      const email = gmail();
      for (let round = 0; round < 2; round += 1) {
        await signIn({ sub: id, email, email_verified: true });
      }
      expect(await t.db.select().from(users).where(eq(users.googleId, id))).toHaveLength(1);
    });

    it('смена email в Google не создаёт нового пользователя', async () => {
      const id = sub();
      const email = gmail();
      await signIn({ sub: id, email, email_verified: true });
      await signIn({ sub: id, email: gmail(), email_verified: true });

      const rows = await t.db.select().from(users).where(eq(users.googleId, id));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.email).toBe(email);
    });

    it('вне Gmail и Workspace уже привязанный аккаунт входит по sub', async () => {
      const id = sub();
      const email = `linked${unique()}@example.org`;
      await signIn({ sub: id, email, email_verified: true });
      const res = await signIn({ sub: id, email, email_verified: true });
      expect(res.headers.get('Location')).toBe(`${APP_URL}/boards`);
      expect(refreshCookieOf(res)).toBeDefined();
    });
  });

  describe('привязка к существующему аккаунту', () => {
    it('по Gmail обнуляет пароль и отзывает сессии', async () => {
      const email = gmail();
      const { cookie: oldCookie, userId } = await registerWithPassword(email);

      const res = await signIn({ sub: sub(), email, email_verified: true });
      expect(res.headers.get('Location')).toBe(`${APP_URL}/boards`);

      const user = await findUser(userId);
      expect(user?.passwordHash).toBeNull();
      expect(user?.googleId).toBeTruthy();

      const old = await refreshWith(oldCookie);
      expect(old.status).toBe(401);
      expect((await json(old)).error.code).toBe('REFRESH_EXPIRED');
      expect((await refreshWith(tokenValue(refreshCookieOf(res)))).status).toBe(200);
    });

    it('регистр Gmail не важен', async () => {
      const email = `Mixed${unique()}@GMail.com`;
      const { userId } = await registerWithPassword(email);
      const res = await signIn({ sub: sub(), email, email_verified: true });
      expect(res.headers.get('Location')).toBe(`${APP_URL}/boards`);
      expect((await findUser(userId))?.googleId).toBeTruthy();
    });

    it('по Workspace (есть hd) тоже привязывает', async () => {
      const email = `worker${unique()}@company.example`;
      const { userId } = await registerWithPassword(email);
      const res = await signIn({ sub: sub(), email, email_verified: true, hd: 'company.example' });
      expect(res.headers.get('Location')).toBe(`${APP_URL}/boards`);
      expect((await findUser(userId))?.passwordHash).toBeNull();
    });

    it('вне Gmail и Workspace отказывает и не трогает аккаунт', async () => {
      const email = `victim${unique()}@example.org`;
      const { cookie, userId } = await registerWithPassword(email);
      const before = await findUser(userId);

      const res = await signIn({ sub: sub(), email, email_verified: true });

      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe(failureOf('email_not_trusted'));
      expect(refreshCookieOf(res)).toBeUndefined();

      const after = await findUser(userId);
      expect(after?.passwordHash).toBe(before?.passwordHash);
      expect(after?.googleId).toBeNull();
      expect((await refreshWith(cookie)).status).toBe(200);

      const sessions = await t.db.select().from(authSessions).where(eq(authSessions.userId, userId));
      expect(sessions).toHaveLength(1);
    });

    it('аккаунт с GitHub получает ещё и Google, пользователь остаётся один', async () => {
      const email = gmail();
      const existing = await createUser(t, { email, githubId: 700_000 + unique() });

      const res = await signIn({ sub: sub(), email, email_verified: true });
      expect(res.headers.get('Location')).toBe(`${APP_URL}/boards`);

      expect(await usersWithEmail(email)).toHaveLength(1);
      const access = await json(await refreshWith(tokenValue(refreshCookieOf(res))));
      expect(access.user).toMatchObject({ id: existing.id, hasGithub: true, hasGoogle: true });
    });

    it('аккаунт с GitHub вне Gmail и Workspace не привязывается', async () => {
      const email = `github${unique()}@example.org`;
      const existing = await createUser(t, { email, githubId: 800_000 + unique() });

      const res = await signIn({ sub: sub(), email, email_verified: true });

      expect(res.headers.get('Location')).toBe(failureOf('email_not_trusted'));
      expect((await findUser(existing.id))?.googleId).toBeNull();
    });

    it('без сессий и пароля привязка проходит', async () => {
      const email = gmail();
      const existing = await createUser(t, { email });
      const res = await signIn({ sub: sub(), email, email_verified: true });
      expect(res.headers.get('Location')).toBe(`${APP_URL}/boards`);
      expect((await findUser(existing.id))?.googleId).toBeTruthy();
    });
  });
});
