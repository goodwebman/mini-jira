import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authThrottle } from '../src/db/schema.js';
import { createSalt, createSaltToken, SALT_TIMESTAMP_WINDOW_MS } from '../src/lib/salt.js';
import { errorCode } from './fixtures.js';
import { createTestApp, json, saltHeaders, signedPost, testEnv, type TestApp } from './helpers.js';

// Значения получены функциями createSalt и createSaltHeaders из @deamondsear/core с этим же секретом.
const CLIENT_VECTOR = {
  email: 'anna@example.com',
  version: '1.2.3',
  timestamp: '1700000000000',
  salt: '831b74e3ad2dfd09166ac94d1be8c72ea610c3b1e3b6af1da3bf69692e4a6d5a',
  token: 'a43bd492f950a6ea9b1e041dcfdd8534b86fa0f81487896a1cb17ebfa1946484',
};

describe('подпись входа и регистрации', () => {
  let t: TestApp;
  let counter = 0;
  const email = () => `salt${(counter += 1)}@example.com`;

  const loginBody = (address: string) => ({ email: address, password: 'bad-pass', remember: true });
  const registerBody = (address: string) => ({
    name: 'Имя',
    email: address,
    password: 'password',
    acceptedTerms: true,
  });

  const rawPost = (path: string, body: unknown, headers: Record<string, string>) =>
    t.app.request(`/api/v1${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(() => t.close());

  describe('совместимость с клиентом', () => {
    it('соль и подпись совпадают с @deamondsear/core', () => {
      expect(createSalt(CLIENT_VECTOR.version, testEnv.SALT_SECRET)).toBe(CLIENT_VECTOR.salt);
      expect(createSaltToken(CLIENT_VECTOR.salt, CLIENT_VECTOR.email, CLIENT_VECTOR.timestamp)).toBe(
        CLIENT_VECTOR.token,
      );
    });

    it('сервер принимает заголовки, собранные клиентской функцией', async () => {
      const local = await createTestApp(new Date(Number(CLIENT_VECTOR.timestamp)));
      const res = await local.app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'fastify-version': CLIENT_VECTOR.version,
          'fastify-timestamp': CLIENT_VECTOR.timestamp,
          'fastify-token': CLIENT_VECTOR.token,
        },
        body: JSON.stringify(loginBody(CLIENT_VECTOR.email)),
      });
      expect(res.status).toBe(401);
      expect(await errorCode(res)).toBe('INVALID_CREDENTIALS');
      await local.close();
    });
  });

  describe.each([
    ['/auth/login', loginBody],
    ['/auth/register', registerBody],
  ] as const)('%s', (path, body) => {
    it.each(['fastify-version', 'fastify-timestamp', 'fastify-token'] as const)(
      'без заголовка %s даёт 403',
      async (header) => {
        const address = email();
        const headers: Record<string, string> = saltHeaders(address, t.clock.current);
        delete headers[header];
        const res = await rawPost(path, body(address), headers);
        expect(res.status).toBe(403);
        expect(await errorCode(res)).toBe('SALT_INVALID');
      },
    );

    it('подпись чужого email не подходит', async () => {
      const res = await rawPost(path, body(email()), saltHeaders('other@example.com', t.clock.current));
      expect(res.status).toBe(403);
      expect(await errorCode(res)).toBe('SALT_INVALID');
    });

    it('неверный токен даёт 403', async () => {
      const address = email();
      const res = await rawPost(path, body(address), {
        ...saltHeaders(address, t.clock.current),
        'fastify-token': 'f'.repeat(64),
      });
      expect(res.status).toBe(403);
    });
  });

  it('подпись на другом секрете не подходит', async () => {
    const address = email();
    const timestamp = String(t.clock.current.getTime());
    const res = await rawPost('/auth/login', loginBody(address), {
      'fastify-version': '1.2.3',
      'fastify-timestamp': timestamp,
      'fastify-token': createSaltToken(createSalt('1.2.3', 'x'.repeat(40)), address, timestamp),
    });
    expect(res.status).toBe(403);
  });

  it('токен от другой версии не подходит', async () => {
    const address = email();
    const res = await rawPost('/auth/login', loginBody(address), {
      ...saltHeaders(address, t.clock.current, '1.2.3'),
      'fastify-version': '9.9.9',
    });
    expect(res.status).toBe(403);
  });

  it('новая версия клиента с верной солью проходит', async () => {
    const address = email();
    const res = await rawPost('/auth/login', loginBody(address), saltHeaders(address, t.clock.current, '2.0.0'));
    expect(res.status).toBe(401);
  });

  describe('время подписи', () => {
    const at = (offset: number) => new Date(t.clock.current.getTime() + offset);

    it.each([
      ['на границе в прошлом', -SALT_TIMESTAMP_WINDOW_MS],
      ['на границе в будущем', SALT_TIMESTAMP_WINDOW_MS],
    ])('%s принимается', async (_name, offset) => {
      const address = email();
      const res = await rawPost('/auth/login', loginBody(address), saltHeaders(address, at(offset)));
      expect(res.status).toBe(401);
    });

    it.each([
      ['устаревшая', -SALT_TIMESTAMP_WINDOW_MS - 1],
      ['из будущего', SALT_TIMESTAMP_WINDOW_MS + 1],
    ])('%s отклоняется', async (_name, offset) => {
      const address = email();
      const res = await rawPost('/auth/login', loginBody(address), saltHeaders(address, at(offset)));
      expect(res.status).toBe(403);
      expect(await errorCode(res)).toBe('SALT_INVALID');
    });

    it('нечисловой timestamp отклоняется', async () => {
      const address = email();
      const res = await rawPost('/auth/login', loginBody(address), {
        ...saltHeaders(address, t.clock.current),
        'fastify-timestamp': 'yesterday',
      });
      expect(res.status).toBe(403);
    });
  });

  it('неверная версия по формату отклоняется', async () => {
    const address = email();
    const res = await rawPost('/auth/login', loginBody(address), {
      ...saltHeaders(address, t.clock.current),
      'fastify-version': 'x'.repeat(65),
    });
    expect(res.status).toBe(403);
  });

  it('email подписывается как в теле, до trim', async () => {
    const address = `  ${email()}  `;
    const res = await rawPost('/auth/login', loginBody(address), saltHeaders(address, t.clock.current));
    expect(res.status).toBe(401);
    expect(await errorCode(res)).toBe('INVALID_CREDENTIALS');
  });

  it('пустой email проходит подпись и получает ошибку поля', async () => {
    const res = await signedPost(t, '/auth/login', { email: '', password: 'x', remember: true });
    expect(res.status).toBe(422);
    expect((await json(res)).error.fields.email).toBe('Введите корректный email');
  });

  it('запрос без подписи не тратит счётчик неудач входа', async () => {
    const address = email();
    await rawPost('/auth/login', loginBody(address), {});
    const rows = await t.db.select().from(authThrottle).where(eq(authThrottle.key, `login:${address}`));
    expect(rows).toEqual([]);
  });

  it('верный вход с подписью выдаёт сессию', async () => {
    const address = email();
    expect((await signedPost(t, '/auth/register', registerBody(address))).status).toBe(201);
    const res = await signedPost(t, '/auth/login', { email: address, password: 'password', remember: true });
    expect(res.status).toBe(200);
  });

  it('заголовки подписи описаны в OpenAPI', async () => {
    const doc = await json(await t.request('GET', '/openapi.json'));
    for (const path of ['/api/v1/auth/login', '/api/v1/auth/register']) {
      const parameters = doc.paths[path].post.parameters as { name: string; in: string; required: boolean }[];
      const headers = parameters.filter((parameter) => parameter.in === 'header');
      expect(headers.map((header) => header.name).sort()).toEqual([
        'fastify-timestamp',
        'fastify-token',
        'fastify-version',
      ]);
      expect(headers.every((header) => header.required)).toBe(true);
      expect(doc.paths[path].post.responses['403'].description).toContain('SALT_INVALID');
    }
  });

  it('refresh, logout и OAuth подпись не требуют', async () => {
    expect(await errorCode(await t.request('POST', '/auth/refresh'))).toBe('REFRESH_MISSING');
    expect((await t.request('POST', '/auth/logout')).status).toBe(204);
    expect((await t.app.request('/api/v1/auth/github/start')).status).toBe(302);
    expect((await t.app.request('/api/v1/auth/google/start')).status).toBe(302);
  });
});
