import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { apiErrorSchema } from '@gwmt/contracts';
import { createApp } from '../src/app.js';
import { createTestDeps, DEFAULT_NOW } from './helpers.js';

describe('служебные ручки', () => {
  let ctx: Awaited<ReturnType<typeof createTestDeps>>;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    ctx = await createTestDeps();
    app = createApp(ctx.deps);
  });

  afterAll(() => ctx.close());

  it('/health ходит в БД и отвечает временем часов приложения', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', time: DEFAULT_NOW.toISOString() });
  });

  it('на ответе есть Cache-Control и X-Request-Id', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('/openapi.json отдаёт OpenAPI 3.1 без токена', async () => {
    const res = await app.request('/api/v1/openapi.json');
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.paths).toHaveProperty('/api/v1/health');
  });

  it.each([
    ['/api/v1/nope', 401],
    ['/somewhere/else', 404],
  ])('неизвестный адрес %s без токена даёт ApiError', async (path, status) => {
    const res = await app.request(path);
    expect(res.status).toBe(status);
    const body = apiErrorSchema.parse(await res.json());
    expect(body.error.requestId).toBe(res.headers.get('X-Request-Id'));
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('падение БД даёт 500 без деталей, а секреты не попадают в лог', async () => {
    const leaky = new Error('Failed query: select 1\nparams: secret-token-hash', {
      cause: new Error('connection refused'),
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = createApp({
      ...ctx.deps,
      db: { execute: () => Promise.reject(leaky) } as unknown as typeof ctx.deps.db,
    });

    const res = await broken.request('/api/v1/health');
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(apiErrorSchema.parse(JSON.parse(text)).error.code).toBe('INTERNAL_ERROR');
    expect(text).not.toContain('connection refused');
    expect(text).not.toContain('secret-token-hash');

    const logged = log.mock.calls.flat().join('\n');
    expect(logged).toContain('connection refused');
    expect(logged).not.toContain('secret-token-hash');
    log.mockRestore();
  });
});
