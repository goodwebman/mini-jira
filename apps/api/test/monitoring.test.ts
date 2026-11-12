import { DrizzleQueryError } from 'drizzle-orm/errors';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppEnv } from '../src/lib/context.js';
import { AppError, handleError } from '../src/lib/errors.js';
import { monitoring } from '../src/lib/monitoring.js';

vi.mock('../src/lib/monitoring.js', () => ({
  monitoring: { captureException: vi.fn(), flush: vi.fn(async () => true) },
}));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function appWithFailure(error: Error) {
  const app = new Hono<AppEnv>();
  app.onError(handleError);
  app.get('/failure/:id', (c) => {
    c.set('userId', c.req.param('id'));
    c.set('requestId', `request-${c.req.param('id')}`);
    throw error;
  });
  return app;
}

describe('API monitoring', () => {
  it('captures unexpected failures with request correlation and route template', async () => {
    const error = new Error('unexpected');
    const response = await appWithFailure(error).request(
      '/failure/one?token=secret',
    );
    expect(response.status).toBe(500);
    expect(monitoring.captureException).toHaveBeenCalledExactlyOnceWith(error, {
      tags: { source: 'api' },
      user: { id: 'one' },
      contexts: {
        http: { method: 'GET', route: '/failure/:id' },
        correlation: { requestId: 'request-one' },
      },
    });
    expect(monitoring.flush).toHaveBeenCalledOnce();
    expect(await response.text()).not.toContain('unexpected');
  });

  it('does not report or flush expected application failures', async () => {
    const response = await appWithFailure(
      new AppError('ROLE_FORBIDDEN'),
    ).request('/failure/one');
    expect(response.status).toBe(403);
    expect(monitoring.captureException).not.toHaveBeenCalled();
    expect(monitoring.flush).not.toHaveBeenCalled();
  });

  it('reports explicit application 500 errors', async () => {
    const error = new AppError('INTERNAL_ERROR');
    expect((await appWithFailure(error).request('/failure/one')).status).toBe(
      500,
    );
    expect(monitoring.captureException).toHaveBeenCalledWith(
      error,
      expect.any(Object),
    );
    expect(monitoring.flush).toHaveBeenCalledOnce();
  });

  it('waits for serverless delivery before returning the failure response', async () => {
    let release: (() => void) | undefined;
    const flushed = new Promise<boolean>((resolve) => {
      release = () => resolve(true);
    });
    vi.mocked(monitoring.flush).mockReturnValueOnce(flushed);
    let completed = false;
    const response = Promise.resolve(
      appWithFailure(new Error('unexpected')).request('/failure/one'),
    ).then((value) => {
      completed = true;
      return value;
    });
    await vi.waitFor(() => expect(monitoring.flush).toHaveBeenCalledOnce());
    expect(completed).toBe(false);
    release?.();
    expect((await response).status).toBe(500);
  });

  it('keeps concurrent users and request IDs in their own events', async () => {
    const app = appWithFailure(new Error('concurrent failure'));
    await Promise.all([
      app.request('/failure/one'),
      app.request('/failure/two'),
    ]);
    const contexts = vi
      .mocked(monitoring.captureException)
      .mock.calls.map(([, context]) => context);
    expect(contexts).toEqual([
      expect.objectContaining({
        user: { id: 'one' },
        contexts: expect.objectContaining({
          correlation: { requestId: 'request-one' },
        }),
      }),
      expect.objectContaining({
        user: { id: 'two' },
        contexts: expect.objectContaining({
          correlation: { requestId: 'request-two' },
        }),
      }),
    ]);
  });

  it('never submits Drizzle SQL or parameter values to the SDK', async () => {
    const cause = new Error('connection refused');
    const error = new DrizzleQueryError(
      'insert into secrets values ($1)',
      ['private-token'],
      cause,
    );
    const response = await appWithFailure(error).request('/failure/one');
    expect(response.status).toBe(500);
    expect(monitoring.captureException).toHaveBeenCalledWith(
      cause,
      expect.any(Object),
    );
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      'private-token',
    );
  });
});
