import { describe, expect, it } from 'vitest';

import { loadEnv } from '../src/lib/env.js';

const valid = {
  DATABASE_URL: 'postgresql://u:p@host/db',
  DATABASE_URL_UNPOOLED: 'postgresql://u:p@host/db',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  SALT_SECRET: 'y'.repeat(32),
  APP_URL: 'https://gwmt-web.vercel.app',
  GITHUB_CLIENT_ID: 'id',
  GITHUB_CLIENT_SECRET: 'secret',
  GOOGLE_CLIENT_ID: 'google-id',
  GOOGLE_CLIENT_SECRET: 'google-secret',
  NODE_ENV: 'production',
};

describe('loadEnv', () => {
  it('принимает полный набор', () => {
    expect(loadEnv(valid).APP_URL).toBe('https://gwmt-web.vercel.app');
  });

  it('называет плохую переменную, но не её значение', () => {
    expect(() =>
      loadEnv({ ...valid, JWT_ACCESS_SECRET: 'short-secret-value' }),
    ).toThrow('JWT_ACCESS_SECRET');
    expect(() =>
      loadEnv({ ...valid, JWT_ACCESS_SECRET: 'short-secret-value' }),
    ).not.toThrow('short-secret-value');
  });

  it('считает длину секрета в байтах', () => {
    expect(
      loadEnv({ ...valid, JWT_ACCESS_SECRET: 'я'.repeat(16) })
        .JWT_ACCESS_SECRET,
    ).toHaveLength(16);
  });

  it.each([
    'https://gwmt-web.vercel.app/',
    'https://gwmt-web.vercel.app/path',
    'nope',
  ])('APP_URL %s отклоняется', (APP_URL) => {
    expect(() => loadEnv({ ...valid, APP_URL })).toThrow('APP_URL');
  });

  it('требует все переменные', () => {
    expect(() => loadEnv({ ...valid, GITHUB_CLIENT_ID: undefined })).toThrow(
      'GITHUB_CLIENT_ID',
    );
    expect(() => loadEnv({ ...valid, SALT_SECRET: 'short' })).toThrow(
      'SALT_SECRET',
    );
    expect(() => loadEnv({ ...valid, GOOGLE_CLIENT_ID: undefined })).toThrow(
      'GOOGLE_CLIENT_ID',
    );
    expect(() => loadEnv({ ...valid, GOOGLE_CLIENT_SECRET: '' })).toThrow(
      'GOOGLE_CLIENT_SECRET',
    );
  });
});
