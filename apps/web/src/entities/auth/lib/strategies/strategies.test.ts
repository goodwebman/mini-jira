// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { AuthError } from '../errors';
import { sanitizeReturnTo } from '../origin-policy';
import {
  TARGET,
  type TestUser,
  createAuth,
  flush,
  makeUser,
} from '../testing/test-kit';
import type {
  AuthResponseInfo,
  AuthStrategy,
  PersistedSession,
} from '../types';
import { ApiKeyStrategy } from './api-key.strategy';
import { BasicStrategy } from './basic.strategy';
import {
  type BearerApi,
  type BearerCredentials,
  BearerStrategy,
} from './bearer.strategy';
import { type DigestCredentials, DigestStrategy } from './digest.strategy';
import { readJwtTtlMs } from './jwt';
import { SessionCookieStrategy } from './session-cookie.strategy';
import { withSsoRedirect } from './sso-redirect';

const context = { signal: new AbortController().signal };

const toBase64 = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)));
const toBase64Url = (text: string) =>
  toBase64(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64 = (value: string) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(value), (char) => char.charCodeAt(0)),
  );
const encode = (value: unknown) => toBase64Url(JSON.stringify(value));
const jwt = (payload: unknown) =>
  `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`;

const FIFTEEN_MINUTES = 15 * 60_000;

/** Токен «из прошлого» по часам клиента: так выглядит расхождение часов. */
const skewedJwt = jwt({ iat: 1_000, exp: 1_000 + 15 * 60 });

function bearerApi(overrides: Partial<BearerApi<TestUser, unknown>> = {}) {
  return {
    login: vi.fn(async () => ({
      accessToken: 'login-token',
      user: makeUser(),
    })),
    refresh: vi.fn(async () => ({
      accessToken: 'refreshed-token',
      user: makeUser(),
    })),
    logout: vi.fn(async () => undefined),
    ...overrides,
  } satisfies BearerApi<TestUser, unknown>;
}

describe('readJwtTtlMs', () => {
  it('считает длительность по exp - iat', () => {
    expect(readJwtTtlMs(skewedJwt)).toBe(FIFTEEN_MINUTES);
  });

  it('читает payload с кириллицей', () => {
    expect(readJwtTtlMs(jwt({ name: 'Анна', iat: 0, exp: 60 }))).toBe(60_000);
  });

  it.each([
    ['непрозрачный токен', 'opaque-token'],
    ['битый base64', 'a.@@@.c'],
    ['не JSON', `a.${toBase64Url('nope')}.c`],
    ['без exp', jwt({ iat: 1 })],
    ['без iat', jwt({ exp: 1 })],
    ['exp не число', jwt({ iat: 1, exp: '2' })],
    ['payload null', jwt(null)],
  ])('%s: срок неизвестен', (_, token) => {
    expect(readJwtTtlMs(token)).toBeNull();
  });
});

describe('BearerStrategy', () => {
  it('подписывает запрос заголовком Authorization', () => {
    const strategy = new BearerStrategy({ api: bearerApi() });
    expect(
      strategy.decorate({ accessToken: 'abc', refreshToken: null }),
    ).toEqual({
      headers: { Authorization: 'Bearer abc' },
    });
  });

  it('формат заголовка настраивается', () => {
    const strategy = new BearerStrategy({
      api: bearerApi(),
      formatHeaders: (token) => ({ Token: token }),
    });
    expect(
      strategy.decorate({ accessToken: 'abc', refreshToken: null }),
    ).toEqual({
      headers: { Token: 'abc' },
    });
  });

  it('срок считается по JWT и не зависит от часов клиента', async () => {
    const strategy = new BearerStrategy({
      api: bearerApi({ refresh: async () => ({ accessToken: skewedJwt }) }),
    });
    const grant = await strategy.renew?.({ ...context, credentials: null });
    expect(grant?.expiresInMs).toBe(FIFTEEN_MINUTES);
  });

  it('явный срок важнее JWT', async () => {
    const strategy = new BearerStrategy({
      api: bearerApi({
        refresh: async () => ({ accessToken: skewedJwt, expiresInMs: 5_000 }),
      }),
    });
    expect(
      (await strategy.renew?.({ ...context, credentials: null }))?.expiresInMs,
    ).toBe(5_000);
  });

  it('непрозрачный токен: срок неизвестен, обновление только по 401', async () => {
    const strategy = new BearerStrategy({ api: bearerApi() });
    expect(
      (await strategy.renew?.({ ...context, credentials: null }))?.expiresInMs,
    ).toBeNull();
  });

  it('restore без сохранённой записи идёт в refresh (cookie)', async () => {
    const api = bearerApi();
    const strategy = new BearerStrategy({ api });
    const grant = await strategy.restore({ ...context, stored: null });
    expect(api.refresh).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: null, accessToken: null }),
    );
    expect(grant?.credentials.accessToken).toBe('refreshed-token');
  });

  it('действующая сохранённая запись поднимает сессию без сети', async () => {
    const api = bearerApi();
    const strategy = new BearerStrategy({ api });
    const stored: PersistedSession<BearerCredentials, TestUser> = {
      credentials: { accessToken: 'stored', refreshToken: 'r' },
      user: makeUser(),
      expiresAt: Date.now() + 60_000,
    };
    const grant = await strategy.restore({ ...context, stored });
    expect(api.refresh).not.toHaveBeenCalled();
    expect(grant?.credentials.accessToken).toBe('stored');
    expect(grant?.expiresInMs).toBeGreaterThan(0);
  });

  it('просроченная запись обновляется по сохранённому refresh-токену', async () => {
    const api = bearerApi();
    const strategy = new BearerStrategy({ api });
    await strategy.restore({
      ...context,
      stored: {
        credentials: { accessToken: 'old', refreshToken: 'stored-refresh' },
        user: null,
        expiresAt: Date.now() - 1,
      },
    });
    expect(api.refresh).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: 'stored-refresh' }),
    );
  });

  it('новый refresh-токен заменяет старый, без него старый сохраняется', async () => {
    const credentials = { accessToken: 'a', refreshToken: 'r1' };
    const rotating = new BearerStrategy({
      api: bearerApi({
        refresh: async () => ({ accessToken: 'b', refreshToken: 'r2' }),
      }),
    });
    expect(
      (await rotating.renew?.({ ...context, credentials }))?.credentials
        .refreshToken,
    ).toBe('r2');

    const stable = new BearerStrategy({
      api: bearerApi({ refresh: async () => ({ accessToken: 'b' }) }),
    });
    expect(
      (await stable.renew?.({ ...context, credentials }))?.credentials
        .refreshToken,
    ).toBe('r1');
  });

  it('без refresh получается простой Bearer: нет renew, холодный старт = гость', async () => {
    const strategy = new BearerStrategy<TestUser, unknown>({
      api: { login: async () => ({ accessToken: 'a' }) },
    });
    expect(strategy.renew).toBeUndefined();
    expect(strategy.logout).toBeUndefined();
    await expect(
      strategy.restore({ ...context, stored: null }),
    ).resolves.toBeNull();
  });

  it.each([
    ['пустой', ''],
    ['с переводом строки (инъекция заголовка)', 'abc\r\nX-Evil: 1'],
    ['с пробелом', 'abc def'],
    ['не строка', 42],
    ['отсутствует', undefined],
  ])('токен %s отвергается', async (_, accessToken) => {
    const strategy = new BearerStrategy({
      api: bearerApi({ login: async () => ({ accessToken }) as never }),
    });
    await expect(strategy.login({}, context)).rejects.toMatchObject({
      code: 'bad_response',
    });
  });

  it('редирект из login пробрасывается как есть', async () => {
    const strategy = new BearerStrategy({
      api: bearerApi({ login: async () => ({ redirectTo: '/sso' }) }),
    });
    await expect(strategy.login({}, context)).resolves.toEqual({
      redirectTo: '/sso',
    });
  });

  it('logout получает текущие реквизиты', async () => {
    const api = bearerApi();
    const strategy = new BearerStrategy({ api });
    await strategy.logout?.({
      ...context,
      credentials: { accessToken: 'a', refreshToken: 'r' },
    });
    expect(api.logout).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'a', refreshToken: 'r' }),
    );
  });

  it('работает в сервисе: 401 от refresh значит kick, а не гость без события', async () => {
    const { auth, eventTypes } = createAuth({
      instance: new BearerStrategy({
        api: bearerApi({
          refresh: vi
            .fn()
            .mockResolvedValueOnce({ accessToken: 'first', user: makeUser() })
            .mockRejectedValue(AuthError.fromStatus(401)),
        }),
      }),
    });
    await auth.bootstrap();
    await auth.execute(TARGET, async () => ({ status: 401 }));
    expect(eventTypes()).toEqual(['ready', 'kick']);
  });
});

describe('SessionCookieStrategy', () => {
  const api = {
    login: vi.fn(async () => makeUser()),
    getUser: vi.fn(async () => makeUser()),
  };

  it('cookie шлёт браузер: заголовков нет', async () => {
    const strategy = new SessionCookieStrategy({ api });
    await expect(strategy.decorate('cookie-session', TARGET)).resolves.toEqual({
      credentialsMode: 'same-origin',
    });
  });

  it('для другого origin режим include', async () => {
    const strategy = new SessionCookieStrategy({
      api,
      credentialsMode: 'include',
    });
    await expect(
      strategy.decorate('cookie-session', TARGET),
    ).resolves.toMatchObject({
      credentialsMode: 'include',
    });
  });

  const csrf = { headerName: 'X-CSRF-Token', readToken: () => 'csrf-value' };

  it.each(['POST', 'put', 'PATCH', 'delete'])(
    '%s идёт с CSRF-токеном',
    async (method) => {
      const strategy = new SessionCookieStrategy({ api, csrf });
      await expect(
        strategy.decorate('cookie-session', { ...TARGET, method }),
      ).resolves.toMatchObject({
        headers: { 'X-CSRF-Token': 'csrf-value' },
      });
    },
  );

  it.each(['GET', 'head', 'OPTIONS'])(
    '%s идёт без CSRF-токена',
    async (method) => {
      const strategy = new SessionCookieStrategy({ api, csrf });
      const decoration = await strategy.decorate('cookie-session', {
        ...TARGET,
        method,
      });
      expect(decoration.headers).toBeUndefined();
    },
  );

  it('в сервисе: 401 при старте значит гость, 401 в работе значит kick без refresh', async () => {
    const getUser = vi
      .fn<() => Promise<TestUser>>()
      .mockRejectedValueOnce(AuthError.fromStatus(401))
      .mockResolvedValue(makeUser());
    const guest = createAuth({
      instance: new SessionCookieStrategy({ api: { ...api, getUser } }),
    });
    expect((await guest.auth.bootstrap()).status).toBe('guest');

    const signedIn = createAuth({
      instance: new SessionCookieStrategy({ api }),
    });
    await signedIn.auth.bootstrap();
    await signedIn.auth.execute(TARGET, async () => ({ status: 401 }));
    expect(signedIn.eventTypes()).toEqual(['ready', 'kick']);
  });

  it('вход поддерживает редирект', async () => {
    const strategy = new SessionCookieStrategy<TestUser, unknown>({
      api: { ...api, login: vi.fn(async () => ({ redirectTo: '/saml' })) },
    });
    await expect(strategy.login({}, context)).resolves.toEqual({
      redirectTo: '/saml',
    });
  });
});

describe('ApiKeyStrategy', () => {
  it('ключ уходит только в заголовке, имя настраивается', () => {
    expect(new ApiKeyStrategy().decorate({ apiKey: 'k' })).toEqual({
      headers: { 'X-API-Key': 'k' },
    });
    expect(
      new ApiKeyStrategy({ headerName: 'X-Token' }).decorate({ apiKey: 'k' }),
    ).toEqual({
      headers: { 'X-Token': 'k' },
    });
  });

  it('restore берёт ключ из конфигурации и проверяет его', async () => {
    const verify = vi.fn(async () => makeUser());
    const strategy = new ApiKeyStrategy({ provideKey: () => 'k', verify });
    const grant = await strategy.restore({ ...context, stored: null });
    expect(grant).toEqual({ credentials: { apiKey: 'k' }, user: makeUser() });
    expect(verify).toHaveBeenCalledWith(
      { 'X-API-Key': 'k' },
      expect.anything(),
    );
  });

  it('нет ключа: гость', async () => {
    await expect(
      new ApiKeyStrategy().restore({ ...context, stored: null }),
    ).resolves.toBeNull();
  });

  it('пустой ключ при входе отвергается', async () => {
    await expect(
      new ApiKeyStrategy().login({ apiKey: '' }, context),
    ).rejects.toMatchObject({
      code: 'bad_request',
    });
  });

  it('в сервисе: 401 закрывает сессию, обновиться нечем', async () => {
    const { auth, eventTypes } = createAuth({
      instance: new ApiKeyStrategy({ provideKey: () => 'k' }),
    });
    await auth.bootstrap();
    await auth.execute(TARGET, async () => ({ status: 401 }));
    expect(eventTypes()).toEqual(['ready', 'kick']);
  });
});

describe('BasicStrategy', () => {
  const verify = vi.fn(async () => makeUser());

  it('кодирует логин и пароль (RFC 7617)', async () => {
    const strategy = new BasicStrategy({ verify });
    const grant = await strategy.login(
      { username: 'Aladdin', password: 'open sesame' },
      context,
    );
    expect(grant.credentials.authorization).toBe(
      'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==',
    );
  });

  it('кириллица кодируется как UTF-8, а не падает', async () => {
    const strategy = new BasicStrategy({ verify });
    const grant = await strategy.login(
      { username: 'анна', password: 'пароль' },
      context,
    );
    expect(
      fromBase64(grant.credentials.authorization.replace('Basic ', '')),
    ).toBe('анна:пароль');
  });

  it('двоеточие в логине запрещено', async () => {
    await expect(
      new BasicStrategy({ verify }).login(
        { username: 'a:b', password: 'x' },
        context,
      ),
    ).rejects.toMatchObject({ code: 'bad_request' });
  });

  it('исходный пароль не хранится', async () => {
    const grant = await new BasicStrategy({ verify }).login(
      { username: 'u', password: 'plain-password' },
      context,
    );
    expect(JSON.stringify(grant)).not.toContain('plain-password');
  });

  it('отключает родное окно браузера и не переживает перезагрузку', async () => {
    const strategy = new BasicStrategy({ verify });
    expect(strategy.decorate({ authorization: 'Basic x' })).toEqual({
      headers: { Authorization: 'Basic x' },
      credentialsMode: 'omit',
    });
    await expect(strategy.restore()).resolves.toBeNull();
  });
});

describe('DigestStrategy', () => {
  const RFC = {
    username: 'Mufasa',
    password: 'Circle of Life',
    realm: 'http-auth@example.org',
    uri: '/dir/index.html',
    nonce: '7ypf/xlj9XXwfDPEoM4URrv/xwf94BcCAzFZH4GiTo0v',
    cnonce: 'f2/wE4q74E6zIJEtWaHKaf5wv/H5QzzpXusqGemxURZJ',
    opaque: 'FQhe/qaU925kfnzjCev0ciny7QMkPqMAFRtzCUYo5tdS',
  };

  const sha256 = async (text: string) =>
    Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)),
      ),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('');

  /** Формула RFC 7616, посчитанная независимо от реализации. */
  async function expectedResponse(params: {
    secret: string;
    nonce: string;
    nc: string;
    cnonce: string;
    method: string;
    uri: string;
  }) {
    const ha2 = await sha256(`${params.method}:${params.uri}`);
    return sha256(
      `${params.secret}:${params.nonce}:${params.nc}:${params.cnonce}:auth:${ha2}`,
    );
  }

  // Как в примере RFC: браузер склеивает два заголовка WWW-Authenticate через запятую.
  const challengeHeader = () =>
    [
      `Digest realm="${RFC.realm}", qop="auth, auth-int", algorithm=SHA-256, nonce="${RFC.nonce}", opaque="${RFC.opaque}"`,
      `Digest realm="${RFC.realm}", qop="auth, auth-int", algorithm=MD5, nonce="${RFC.nonce}", opaque="${RFC.opaque}"`,
    ].join(', ');

  function fakeResponse(status: number, headers: Record<string, string> = {}) {
    return new Response(status === 204 ? null : '{}', { status, headers });
  }

  function createDigest(
    options: Partial<
      ConstructorParameters<typeof DigestStrategy<TestUser>>[0]
    > = {},
  ) {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        fakeResponse(401, { 'WWW-Authenticate': challengeHeader() }),
      )
      .mockResolvedValue(fakeResponse(200));
    const strategy = new DigestStrategy<TestUser>({
      verifyUrl: 'https://api.test/dir/index.html',
      fetch,
      ...options,
    });
    return { strategy, fetch };
  }

  async function loggedIn() {
    const context_ = createDigest();
    const grant = await context_.strategy.login(
      { username: RFC.username, password: RFC.password },
      context,
    );
    return { ...context_, credentials: grant.credentials };
  }

  function parseAuthorization(header: string | undefined) {
    const params = new Map<string, string>();
    for (const match of (header ?? '').matchAll(
      /([\w*]+)=(?:"((?:[^"\\]|\\.)*)"|([^,\s]+))/g,
    )) {
      params.set(match[1]!, match[2] ?? match[3]!);
    }
    return params;
  }

  const unauthorizedInfo = (header: string): AuthResponseInfo => ({
    status: 401,
    header: (name) => (name === 'WWW-Authenticate' ? header : null),
    json: async () => ({}),
  });

  it('формула теста совпадает с контрольным примером RFC 7616', async () => {
    const secret = await sha256(`${RFC.username}:${RFC.realm}:${RFC.password}`);
    await expect(
      expectedResponse({
        secret,
        nonce: RFC.nonce,
        nc: '00000001',
        cnonce: RFC.cnonce,
        method: 'GET',
        uri: RFC.uri,
      }),
    ).resolves.toBe(
      '753927fa0e85d155564e2e272a28d1802ca10daf4496794697cf8db5856cb6c1',
    );
  });

  it('заголовок вычислен по RFC 7616', async () => {
    const { strategy, credentials } = await loggedIn();
    const { headers, credentialsMode } = await strategy.decorate(credentials, {
      url: 'https://api.test/dir/index.html?x=1',
      method: 'get',
    });
    const params = parseAuthorization(headers?.Authorization);

    expect(headers?.Authorization.startsWith('Digest ')).toBe(true);
    expect(credentialsMode).toBe('omit');
    expect(params.get('username')).toBe(RFC.username);
    expect(params.get('uri')).toBe('/dir/index.html?x=1');
    expect(params.get('algorithm')).toBe('SHA-256');
    expect(params.get('opaque')).toBe(RFC.opaque);
    expect(params.get('response')).toBe(
      await expectedResponse({
        secret: await sha256(`${RFC.username}:${RFC.realm}:${RFC.password}`),
        nonce: RFC.nonce,
        nc: params.get('nc')!,
        cnonce: params.get('cnonce')!,
        method: 'GET',
        uri: '/dir/index.html?x=1',
      }),
    );
  });

  it('вход: сначала вызов, потом запрос с ответом', async () => {
    const { fetch, credentials } = await loggedIn();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(
      new Headers(fetch.mock.calls[0]?.[1]?.headers).has('Authorization'),
    ).toBe(false);
    expect(
      new Headers(fetch.mock.calls[1]?.[1]?.headers).get('Authorization'),
    ).toContain('Digest ');
    expect(credentials.counter).toBe(1);
  });

  it('пароль после входа не хранится', async () => {
    const { credentials } = await loggedIn();
    expect(JSON.stringify(credentials)).not.toContain(RFC.password);
  });

  it('неверный пароль: unauthorized', async () => {
    const { strategy, fetch } = createDigest();
    fetch.mockReset();
    fetch
      .mockResolvedValueOnce(
        fakeResponse(401, { 'WWW-Authenticate': challengeHeader() }),
      )
      .mockResolvedValueOnce(
        fakeResponse(401, { 'WWW-Authenticate': challengeHeader() }),
      );
    await expect(
      strategy.login({ username: 'u', password: 'bad' }, context),
    ).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('счётчик у параллельных запросов не совпадает', async () => {
    const { strategy, credentials } = await loggedIn();
    const decorations = await Promise.all(
      Array.from({ length: 5 }, () => strategy.decorate(credentials, TARGET)),
    );
    const counters = decorations.map((item) =>
      parseAuthorization(item.headers?.Authorization).get('nc'),
    );
    expect(new Set(counters).size).toBe(5);
  });

  it('вариант -sess считает HA1 от cnonce', async () => {
    const { strategy, fetch } = createDigest();
    fetch.mockReset();
    fetch
      .mockResolvedValueOnce(
        fakeResponse(401, {
          'WWW-Authenticate': `Digest realm="r", qop="auth", algorithm=SHA-256-sess, nonce="n"`,
        }),
      )
      .mockResolvedValue(fakeResponse(200));
    const { credentials } = await strategy.login(
      { username: 'u', password: 'p' },
      context,
    );
    const { headers } = await strategy.decorate(credentials, {
      url: 'https://a.test/x',
      method: 'GET',
    });
    const params = parseAuthorization(headers?.Authorization);
    const secret = await sha256(
      `${await sha256('u:r:p')}:n:${params.get('cnonce')}`,
    );

    expect(params.get('algorithm')).toBe('SHA-256-sess');
    expect(params.get('response')).toBe(
      await expectedResponse({
        secret,
        nonce: 'n',
        nc: params.get('nc')!,
        cnonce: params.get('cnonce')!,
        method: 'GET',
        uri: '/x',
      }),
    );
  });

  it('stale=true: nonce обновлён, счётчик сброшен, повтор', async () => {
    const { strategy, credentials } = await loggedIn();
    const verdict = strategy.assess(
      unauthorizedInfo(
        `Digest realm="${RFC.realm}", qop="auth", algorithm=SHA-256, nonce="fresh", stale=true`,
      ),
      credentials,
    );
    expect(verdict).toEqual({ action: 'retry' });
    expect(credentials).toMatchObject({ nonce: 'fresh', counter: 0 });
  });

  it('401 без stale: реквизиты отвергнуты, сессии конец', async () => {
    const { strategy, credentials } = await loggedIn();
    expect(
      strategy.assess(unauthorizedInfo(challengeHeader()), credentials),
    ).toEqual({
      action: 'reject',
    });
  });

  it('nextnonce применяется для следующего запроса', async () => {
    const { strategy, credentials } = await loggedIn();
    const verdict = strategy.assess(
      {
        status: 200,
        header: (name) =>
          name === 'Authentication-Info' ? 'nextnonce="after", qop=auth' : null,
        json: async () => ({}),
      },
      credentials,
    );
    expect(verdict).toEqual({ action: 'pass' });
    expect(credentials).toMatchObject({ nonce: 'after', counter: 0 });
  });

  it('сервер предлагает только MD5: вход отказывает, а не откатывается на слабый алгоритм', async () => {
    const { strategy, fetch } = createDigest();
    fetch.mockReset();
    fetch.mockResolvedValue(
      fakeResponse(401, {
        'WWW-Authenticate':
          'Digest realm="r", qop="auth", algorithm=MD5, nonce="n"',
      }),
    );
    await expect(
      strategy.login({ username: 'u', password: 'p' }, context),
    ).rejects.toMatchObject({
      code: 'misconfigured',
    });
  });

  it('отсутствие algorithm означает MD5 и тоже отвергается', async () => {
    const { strategy, fetch } = createDigest();
    fetch.mockReset();
    fetch.mockResolvedValue(
      fakeResponse(401, {
        'WWW-Authenticate': 'Digest realm="r", qop="auth", nonce="n"',
      }),
    );
    await expect(
      strategy.login({ username: 'u', password: 'p' }, context),
    ).rejects.toMatchObject({
      code: 'misconfigured',
    });
  });

  it('MD5 можно подключить только явно', async () => {
    const md5 = vi.fn((text: string) => `md5(${text})`);
    const { strategy, fetch } = createDigest({ hashers: { MD5: md5 } });
    fetch.mockReset();
    fetch
      .mockResolvedValueOnce(
        fakeResponse(401, {
          'WWW-Authenticate':
            'Digest realm="r", qop="auth", algorithm=MD5, nonce="n"',
        }),
      )
      .mockResolvedValue(fakeResponse(200));
    await strategy.login({ username: 'u', password: 'p' }, context);
    expect(md5).toHaveBeenCalled();
  });

  it('из нескольких вызовов выбирается поддерживаемый, запятые в кавычках не ломают разбор', async () => {
    const { strategy, fetch } = createDigest();
    fetch.mockReset();
    fetch
      .mockResolvedValueOnce(
        fakeResponse(401, {
          'WWW-Authenticate':
            'Basic realm="b", Digest realm="a, \\"quoted\\"", qop="auth", algorithm=MD5, nonce="weak", Digest realm="a, \\"quoted\\"", qop="auth", algorithm=SHA-256, nonce="strong"',
        }),
      )
      .mockResolvedValue(fakeResponse(200));
    const { credentials } = await strategy.login(
      { username: 'u', password: 'p' },
      context,
    );
    expect(credentials).toMatchObject({
      nonce: 'strong',
      realm: 'a, "quoted"',
      algorithm: 'SHA-256',
    });
  });

  it('сервер без qop=auth отвергается', async () => {
    const { strategy, fetch } = createDigest();
    fetch.mockReset();
    fetch.mockResolvedValue(
      fakeResponse(401, {
        'WWW-Authenticate':
          'Digest realm="r", qop="auth-int", algorithm=SHA-256, nonce="n"',
      }),
    );
    await expect(
      strategy.login({ username: 'u', password: 'p' }, context),
    ).rejects.toMatchObject({
      code: 'misconfigured',
    });
  });

  it('verifyUrl без защиты: это ошибка настройки', async () => {
    const { strategy, fetch } = createDigest();
    fetch.mockReset();
    fetch.mockResolvedValue(fakeResponse(200));
    await expect(
      strategy.login({ username: 'u', password: 'p' }, context),
    ).rejects.toMatchObject({
      code: 'misconfigured',
    });
  });

  it('спецсимволы в логине экранируются, не-ASCII идёт через username*', async () => {
    const { strategy, credentials } = await loggedIn();
    const quoted: DigestCredentials = { ...credentials, username: 'a"b\\c' };
    const quotedHeader = (await strategy.decorate(quoted, TARGET)).headers
      ?.Authorization;
    expect(quotedHeader).toContain('username="a\\"b\\\\c"');

    const cyrillic: DigestCredentials = { ...credentials, username: 'анна' };
    const cyrillicHeader = (await strategy.decorate(cyrillic, TARGET)).headers
      ?.Authorization;
    expect(cyrillicHeader).toContain(
      `username*=UTF-8''${encodeURIComponent('анна')}`,
    );
  });

  it('сессия не переживает перезагрузку', async () => {
    const { strategy } = createDigest();
    await expect(strategy.restore()).resolves.toBeNull();
  });
});

describe('sanitizeReturnTo', () => {
  it.each([
    ['/boards', '/boards'],
    ['/boards/1?tab=a#b', '/boards/1?tab=a#b'],
    ['/', '/'],
  ])('%s проходит', (value, expected) => {
    expect(sanitizeReturnTo(value)).toBe(expected);
  });

  it.each([
    ['абсолютный URL', 'https://evil.test'],
    ['протокол-относительный', '//evil.test'],
    ['обратный слэш', '/\\evil.test'],
    ['таб внутри', '/\t/evil.test'],
    ['перевод строки', '/\n/evil.test'],
    ['возврат каретки', '/\r/evil.test'],
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/html,x'],
    ['без слэша', 'evil.test'],
    ['пустая строка', ''],
    ['неразбираемый адрес', '//['],
    ['неразбираемый адрес с обратным слэшем', '/\\['],
    ['null', null],
    ['undefined', undefined],
  ])('%s заменяется на безопасный путь', (_, value) => {
    expect(sanitizeReturnTo(value, '/home')).toBe('/home');
  });

  it('путь с .. не выводит за пределы своего origin', () => {
    expect(sanitizeReturnTo('/a/../../b')).toBe('/b');
  });
});

describe('withSsoRedirect', () => {
  function createSso() {
    const base = {
      name: 'base',
      restore: vi.fn(async () => null),
      login: vi.fn(async () => ({ credentials: 'c', user: makeUser() })),
      renew: vi.fn(async () => ({ credentials: 'c2' })),
      logout: vi.fn(async () => undefined),
      decorate: vi.fn(() => ({})),
    };
    const strategy = withSsoRedirect<
      string,
      TestUser,
      { password: string },
      'google' | 'github'
    >(base as unknown as AuthStrategy<string, TestUser, { password: string }>, {
      buildUrl: (provider, returnTo) =>
        `/auth/${provider}/start?next=${encodeURIComponent(returnTo)}`,
      defaultReturnTo: '/boards',
    });
    return { base, strategy };
  }

  it('SSO: редирект на сервер, обычный вход стратегии не вызывается', async () => {
    const { base, strategy } = createSso();
    await expect(
      strategy.login({ sso: 'google', returnTo: '/tasks/1' }, context),
    ).resolves.toEqual({
      redirectTo: '/auth/google/start?next=%2Ftasks%2F1',
    });
    expect(base.login).not.toHaveBeenCalled();
  });

  it('вредоносный returnTo заменяется', async () => {
    const { strategy } = createSso();
    await expect(
      strategy.login({ sso: 'github', returnTo: '//evil.test' }, context),
    ).resolves.toEqual({ redirectTo: '/auth/github/start?next=%2Fboards' });
  });

  it('обычный вход идёт в стратегию', async () => {
    const { base, strategy } = createSso();
    await strategy.login({ password: 'x' }, context);
    expect(base.login).toHaveBeenCalledWith({ password: 'x' }, context);
  });

  it('остальные методы делегируются, this стратегии сохраняется', async () => {
    const { base, strategy } = createSso();
    await strategy.renew?.({ ...context, credentials: null });
    await strategy.logout?.({ ...context, credentials: null });
    expect(base.renew).toHaveBeenCalledTimes(1);
    expect(base.logout).toHaveBeenCalledTimes(1);
  });

  it('работает с классом, у которого приватные поля', async () => {
    const strategy = withSsoRedirect(
      new BasicStrategy({ verify: async () => makeUser() }),
      {
        buildUrl: () => '/sso',
      },
    );
    await expect(
      strategy.login({ username: 'u', password: 'p' }, context),
    ).resolves.toMatchObject({
      credentials: { authorization: expect.any(String) },
    });
    await expect(
      strategy.restore({ ...context, stored: null }),
    ).resolves.toBeNull();
    expect(
      strategy.decorate({ authorization: 'Basic x' }, TARGET),
    ).toMatchObject({
      credentialsMode: 'omit',
    });
  });

  it('отсутствующие у стратегии методы не появляются', () => {
    const strategy = withSsoRedirect(
      new BasicStrategy({ verify: async () => makeUser() }),
      {
        buildUrl: () => '/sso',
      },
    );
    expect(strategy.renew).toBeUndefined();
    expect(strategy.logout).toBeUndefined();
  });

  it('в сервисе: браузер уводится на сервер', async () => {
    const { strategy } = createSso();
    const { auth, platform } = createAuth({
      instance: strategy,
    });
    await auth.bootstrap();
    await auth.login({ sso: 'google' });
    await flush();
    expect(platform.navigated).toEqual([
      'https://app.test/auth/google/start?next=%2Fboards',
    ]);
  });
});
