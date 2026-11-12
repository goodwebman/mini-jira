import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { resolve } from 'node:path';

import { createApp } from '../src/app.js';
import * as schema from '../src/db/schema.js';
import type { AppDeps } from '../src/lib/context.js';
import { loadEnv } from '../src/lib/env.js';
import { signAccessToken } from '../src/lib/jwt.js';
import { createSalt, createSaltToken } from '../src/lib/salt.js';

export const testEnv = loadEnv({
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  DATABASE_URL_UNPOOLED: 'postgresql://test:test@localhost/test',
  JWT_ACCESS_SECRET: 'test-secret-test-secret-test-secret-42',
  SALT_SECRET: 'test-salt-secret-test-salt-secret-42',
  APP_URL: 'http://localhost:5173',
  GITHUB_CLIENT_ID: 'test-client-id',
  GITHUB_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
  NODE_ENV: 'test',
});

/** Понедельник, 09:00 по Москве. */
export const DEFAULT_NOW = new Date('2026-11-09T06:00:00.000Z');

const FAR_FUTURE = new Date('2036-01-01T00:00:00.000Z');

export async function createTestDeps(startAt = DEFAULT_NOW) {
  const client = new PGlite({ extensions: { citext, pg_trgm } });
  const db = drizzle({ client, schema });
  await migrate(db, {
    migrationsFolder: resolve(import.meta.dirname, '../drizzle'),
  });
  const clock = { current: startAt };

  const deps: AppDeps = {
    db,
    withTx: (fn) => db.transaction((tx) => fn(tx)),
    env: testEnv,
    now: () => clock.current,
  };

  return { deps, db, clock, close: () => client.close() };
}

export type TestDeps = Awaited<ReturnType<typeof createTestDeps>>;

export async function createTestApp(startAt?: Date) {
  const ctx = await createTestDeps(startAt);
  const app = createApp(ctx.deps);

  const request = (
    method: string,
    path: string,
    token?: string | null,
    body?: unknown,
  ) =>
    app.request(`/api/v1${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

  const advance = (ms: number) => {
    ctx.clock.current = new Date(ctx.clock.current.getTime() + ms);
  };

  return { ...ctx, app, request, advance };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

export function saltHeaders(email: string, at: Date, version = '1.2.3') {
  const timestamp = String(at.getTime());
  return {
    'fastify-version': version,
    'fastify-timestamp': timestamp,
    'fastify-token': createSaltToken(
      createSalt(version, testEnv.SALT_SECRET),
      email,
      timestamp,
    ),
  };
}

const SALTED_PATHS = ['/auth/login', '/auth/register'];

/** POST как от настоящего клиента: вход и регистрация уходят с подписью. */
export function signedPost(
  t: TestApp,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const email = (body as { email?: unknown } | undefined)?.email;
  return t.app.request(`/api/v1${path}`, {
    method: 'POST',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(SALTED_PATHS.includes(path)
        ? saltHeaders(typeof email === 'string' ? email : '', t.clock.current)
        : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

let userCounter = 0;

/** Пользователь без пароля и токен для него: scrypt в сотнях тестов занял бы минуты. */
export async function createUser(
  t: TestApp,
  overrides: Partial<typeof schema.users.$inferInsert> = {},
) {
  userCounter += 1;
  const [user] = await t.db
    .insert(schema.users)
    .values({
      email: `user${userCounter}@example.com`,
      name: `Пользователь ${userCounter}`,
      colorIndex: userCounter % 6,
      termsAcceptedAt: t.clock.current,
      ...overrides,
    })
    .returning();
  if (!user) throw new Error('user was not created');
  // Выдан «из будущего», чтобы не истекать, когда тест перематывает часы на недели вперёд.
  const { accessToken } = await signAccessToken(
    { userId: user.id, sessionId: crypto.randomUUID() },
    testEnv.JWT_ACCESS_SECRET,
    FAR_FUTURE,
  );
  return { ...user, token: accessToken };
}

export type TestUser = Awaited<ReturnType<typeof createUser>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tests assert the response shape at runtime.
export const json = async <T = any>(res: Response) => (await res.json()) as T;
