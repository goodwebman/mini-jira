import type { ErrorEvent } from '@sentry/core';
import { describe, expect, it, vi } from 'vitest';

import {
  beforeSend,
  createMonitoring,
  isExpectedError,
  redactUrl,
  scrubBreadcrumb,
  scrubEvent,
  scrubRecord,
  scrubText,
} from '../src/index.js';

function setup(
  overrides: Partial<Parameters<typeof createMonitoring>[0]> = {},
) {
  const sdk = {
    init: vi.fn(),
    isEnabled: vi.fn(() => true),
    captureException: vi.fn(() => 'event-id'),
    setUser: vi.fn(),
    addBreadcrumb: vi.fn(),
    flush: vi.fn(async () => true),
  };
  const monitoring = createMonitoring({
    sdk,
    enabled: true,
    dsn: ' https://key@sentry.example/1 ',
    environment: 'test',
    release: ' revision ',
    ...overrides,
  });
  return { sdk, monitoring };
}

describe('monitoring lifecycle and SDK isolation', () => {
  it('does nothing before init, without DSN, or when disabled', async () => {
    for (const overrides of [{ enabled: false }, { dsn: ' ' }, {}]) {
      const { monitoring, sdk } = setup(overrides);
      expect(monitoring.captureException(new Error('ignored'))).toBeUndefined();
      monitoring.setUser('1');
      monitoring.addBreadcrumb('login');
      expect(await monitoring.flush()).toBe(false);
      expect(sdk.init).not.toHaveBeenCalled();
      expect(sdk.captureException).not.toHaveBeenCalled();
      expect(sdk.setUser).not.toHaveBeenCalled();
      expect(sdk.addBreadcrumb).not.toHaveBeenCalled();
      if (overrides.enabled === false || overrides.dsn)
        expect(monitoring.init()).toBe(false);
    }
  });

  it('initializes once with restrictive SDK v11 data collection and full error sampling', () => {
    const { monitoring, sdk } = setup();
    expect(monitoring.init()).toBe(true);
    expect(monitoring.init()).toBe(true);
    expect(sdk.init).toHaveBeenCalledOnce();
    const options = sdk.init.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      dsn: 'https://key@sentry.example/1',
      release: 'revision',
      sampleRate: 1,
      tracePropagationTargets: [],
      maxBreadcrumbs: 30,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        databaseQueryData: false,
        urlQueryParams: false,
        stackFrameVariables: false,
      },
    });
    expect(options?.beforeSendLog?.({} as never)).toBeNull();
    expect(options?.beforeSendMetric?.({} as never)).toBeNull();
    expect(options).not.toHaveProperty('tracesSampleRate');
    expect(options).not.toHaveProperty('sendDefaultPii');
  });

  it('permits retry after failed initialization and detects a disabled SDK', () => {
    const { monitoring, sdk } = setup();
    sdk.init.mockImplementationOnce(() => {
      throw new Error('SDK init');
    });
    expect(monitoring.init()).toBe(false);
    expect(monitoring.init()).toBe(true);
    sdk.isEnabled.mockReturnValue(false);
    expect(monitoring.isEnabled()).toBe(false);
    expect(monitoring.captureException(new Error('disabled'))).toBeUndefined();
  });

  it('preserves the original Error and per-event context, normalizes other thrown values', () => {
    const { monitoring, sdk } = setup();
    monitoring.init();
    const error = new Error('bug');
    const context = { tags: { source: 'query' }, user: { id: '1' } };
    expect(monitoring.captureException(error, context)).toBe('event-id');
    expect(sdk.captureException).toHaveBeenLastCalledWith(error, context);
    monitoring.captureException('string failure');
    expect(sdk.captureException).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: 'string failure' }),
      undefined,
    );
    monitoring.captureException({ password: 'hidden', message: 'not trusted' });
    expect(sdk.captureException).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: 'Non-Error exception' }),
      undefined,
    );
  });

  it('never propagates SDK errors, including rejected flushes and broken error getters', async () => {
    const { monitoring, sdk } = setup();
    monitoring.init();
    sdk.captureException.mockImplementation(() => {
      throw new Error('capture');
    });
    sdk.setUser.mockImplementation(() => {
      throw new Error('user');
    });
    sdk.addBreadcrumb.mockImplementation(() => {
      throw new Error('breadcrumb');
    });
    sdk.flush.mockRejectedValue(new Error('flush'));
    expect(monitoring.captureException(new Error('app'))).toBeUndefined();
    expect(() => monitoring.setUser('1')).not.toThrow();
    expect(() => monitoring.addBreadcrumb('ready')).not.toThrow();
    expect(await monitoring.flush()).toBe(false);
    const hostile = Object.defineProperty({}, 'status', {
      get() {
        throw new Error('getter');
      },
    });
    expect(() => monitoring.captureException(hostile)).not.toThrow();
    sdk.isEnabled.mockImplementation(() => {
      throw new Error('enabled');
    });
    expect(monitoring.isEnabled()).toBe(false);
  });

  it('clears identity and uses a bounded SDK flush timeout', async () => {
    const { monitoring, sdk } = setup();
    monitoring.init();
    monitoring.setUser('1');
    monitoring.setUser(null);
    expect(sdk.setUser.mock.calls).toEqual([[{ id: '1' }], [null]]);
    expect(await monitoring.flush()).toBe(true);
    expect(sdk.flush).toHaveBeenCalledWith(2000);
  });
});

describe('error policy', () => {
  it.each([
    { name: 'AbortError' },
    { name: 'CancelledError' },
    { name: 'CanceledError' },
    { name: 'AuthError', code: 'session_changed' },
    { name: 'AuthError', code: 'destroyed' },
    { status: 401 },
    { status: 403 },
    { status: 404 },
    { status: 409 },
    { status: 422 },
    { statusCode: 429 },
  ])('drops handled expected failures: %j', (error) => {
    expect(isExpectedError(error)).toBe(true);
    expect(
      beforeSend({ type: undefined }, { originalException: error }),
    ).toBeNull();
    const { monitoring, sdk } = setup();
    monitoring.init();
    monitoring.captureException(error);
    expect(sdk.captureException).not.toHaveBeenCalled();
  });

  it.each([
    new TypeError('Failed to fetch'),
    { status: 500 },
    { status: 503 },
    { name: 'AuthError', code: 'server' },
    { name: 'AuthError', code: 'unknown' },
  ])('keeps actionable errors: %j', (error) => {
    expect(
      beforeSend(
        { type: undefined, message: 'bug' },
        { originalException: error },
      ),
    ).not.toBeNull();
  });

  it('always retains unhandled failures, even when their HTTP status is expected', () => {
    const event: ErrorEvent = {
      type: undefined,
      exception: {
        values: [{ mechanism: { type: 'global', handled: false } }],
      },
    };
    expect(
      beforeSend(event, { originalException: { status: 401 } }),
    ).not.toBeNull();
  });

  it('fails closed on hostile events and removes unsanitized attachments', () => {
    const event = Object.defineProperty({ type: undefined }, 'message', {
      get() {
        throw new Error('bad getter');
      },
    });
    const hint = {
      attachments: [{ filename: 'private.txt', data: 'sensitive' }],
    };
    expect(beforeSend(event, hint)).toBeNull();
    expect(hint.attachments).toEqual([]);
  });
});

describe('privacy', () => {
  it.each([
    [
      'https://user:pass@host/path?access_token=secret#code',
      'https://host/path',
    ],
    ['/callback?code=secret#private', '/callback'],
  ])('redacts URLs: %s', (input, output) =>
    expect(redactUrl(input)).toBe(output),
  );

  it.each([
    'email=user@example.com',
    'Bearer opaque-value',
    'Basic opaque-value',
    'password=opaque-value',
    '{"password":"opaque-value"}',
    '{"accessToken":"opaque-value"}',
    '{"password":"a value with spaces"}',
    'request https://user:pass@host/api?token=opaque-value',
    'Failed query: insert into users values ($1)\nparams: opaque-value',
  ])('scrubs text: %s', (text) => {
    const result = scrubText(text);
    expect(result).not.toContain('opaque-value');
    expect(result).not.toContain('user@example.com');
    expect(result).not.toContain('a value with spaces');
    expect(result).not.toContain('user:pass');
  });

  it('handles cycles, accessors, hostile proxies and prototype keys without mutating input', () => {
    const getter = vi.fn(() => 'opaque-value');
    const input: Record<string, unknown> = {
      password: 'opaque-value',
      nested: { authorization: 'Bearer opaque-value', ok: 1 },
      url: '/tasks?q=opaque-value',
    };
    input.self = input;
    Object.defineProperty(input, 'getter', { get: getter, enumerable: true });
    const result = scrubRecord(input);
    expect(JSON.stringify(result)).not.toContain('opaque-value');
    expect(result.self).toBe('[Filtered]');
    expect(result.nested).toEqual({ authorization: '[Filtered]', ok: 1 });
    expect(getter).not.toHaveBeenCalled();
    expect(input.password).toBe('opaque-value');
    const proto = scrubRecord(JSON.parse('{"__proto__":{"polluted":true}}'));
    expect(Object.getPrototypeOf(proto)).toBe(Object.prototype);
    expect({}).not.toHaveProperty('polluted');
    expect(
      scrubRecord(
        new Proxy(
          {},
          {
            ownKeys() {
              throw new Error('proxy');
            },
          },
        ),
      ),
    ).toEqual({});
  });

  it('bounds depth, breadth, arrays and total traversal work', () => {
    const huge = Object.fromEntries(
      Array.from({ length: 500 }, (_, index) => [String(index), 'x']),
    );
    expect(Object.keys(scrubRecord(huge))).toHaveLength(100);
    expect(
      scrubRecord({ array: Array.from({ length: 500 }, () => 'x') }).array,
    ).toHaveLength(100);
    let deep: Record<string, unknown> = { secret: 'opaque-value' };
    for (let i = 0; i < 100; i++) deep = { nested: deep };
    expect(JSON.stringify(scrubRecord(deep))).not.toContain('opaque-value');
    expect(scrubText('x'.repeat(4096))).toHaveLength(2048);
  });

  it('drops oversized strings before redaction without exposing URL credentials at the cutoff', () => {
    expect(
      scrubText(`https://alice:private-secret${'x'.repeat(9000)}@host/path`),
    ).toBe('[Filtered]');
  });

  it('does not invoke array accessors or read descriptors beyond the item limit', () => {
    const getter = vi.fn(() => 'private');
    const array: unknown[] = [];
    Object.defineProperty(array, '0', { get: getter, enumerable: true });
    expect(scrubRecord({ array }).array).toEqual(['[Filtered]']);
    expect(getter).not.toHaveBeenCalled();
    const descriptor = vi.fn(Reflect.getOwnPropertyDescriptor);
    const huge = Object.fromEntries(
      Array.from({ length: 500 }, (_, index) => [String(index), 'x']),
    );
    scrubRecord(
      new Proxy<Record<string, unknown>>(huge, {
        getOwnPropertyDescriptor: descriptor,
      }),
    );
    expect(descriptor.mock.calls.length).toBeLessThan(205);
  });

  it('drops console/DOM messages and excludes raw breadcrumb data', () => {
    expect(
      scrubBreadcrumb({ category: 'console', message: 'private' }),
    ).toBeNull();
    expect(
      scrubBreadcrumb({ category: 'ui.click', message: 'private' }),
    ).toBeNull();
    expect(
      scrubBreadcrumb({
        category: 'xhr',
        message: 'private',
        data: {
          url: '/api?token=secret',
          status_code: 503,
          body: 'private',
          headers: 'private',
        },
      }),
    ).toMatchObject({
      data: { url: '/api', status_code: 503 },
    });
    expect(
      JSON.stringify(scrubBreadcrumb({ category: 'xhr', message: 'private' })),
    ).not.toContain('private');
  });

  it('preserves symbolication and grouping fields while stripping request, identity and frame secrets', () => {
    const event: ErrorEvent = {
      type: undefined,
      event_id: 'event',
      release: 'release',
      environment: 'production',
      transaction: '/callback?code=private',
      user: { id: '42', email: 'private@example.com', ip_address: '127.0.0.1' },
      server_name: 'private-host',
      threads: { values: [{ name: 'private-thread' }] },
      request: {
        method: 'POST',
        url: 'https://user:private@host/api?token=private',
        data: 'private',
        headers: { Authorization: 'private' },
        cookies: { session: 'private' },
        query_string: 'private',
      },
      exception: {
        values: [
          {
            type: 'TypeError',
            value: 'Bearer private',
            mechanism: { type: 'global', handled: false },
            stacktrace: {
              frames: [
                {
                  filename: '/assets/index.js?secret=private',
                  function: 'render',
                  lineno: 42,
                  colno: 2,
                  vars: { password: 'private' },
                  context_line: 'private',
                },
              ],
            },
          },
        ],
      },
      debug_meta: {
        images: [
          {
            type: 'sourcemap',
            code_file: '/assets/index.js?key=private',
            debug_id: 'debug-id',
          },
        ],
      },
      logentry: { message: 'failure', params: ['private'] },
      extra: { token: 'private' },
      contexts: { custom: { password: 'private' } },
    };
    const cleaned = scrubEvent(event);
    expect(JSON.stringify(cleaned)).not.toContain('private');
    expect(cleaned.user).toEqual({ id: '42' });
    expect(cleaned.request).toEqual({
      method: 'POST',
      url: 'https://host/api',
    });
    expect(cleaned.exception?.values?.[0]).toMatchObject({
      type: 'TypeError',
      mechanism: { handled: false },
      stacktrace: {
        frames: [
          {
            filename: '/assets/index.js',
            function: 'render',
            lineno: 42,
            colno: 2,
          },
        ],
      },
    });
    expect(cleaned.debug_meta).toEqual({
      images: [
        {
          type: 'sourcemap',
          code_file: '/assets/index.js',
          debug_id: 'debug-id',
        },
      ],
    });
    expect(cleaned.release).toBe('release');
    expect(event.request?.data).toBe('private');
  });
});
