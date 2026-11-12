// @vitest-environment node
import { createMonitoring } from '@gwmt/monitoring';
import { CancelledError } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { AuthError } from '@/entities/auth';
import { AuthStore } from '@/entities/auth/testing';
import { HttpError } from '@/shared/api';

import { bindAuthMonitoring, bindQueryMonitoring } from './bind-monitoring';
import { createQueryClient } from './query/queryClient';

function setup() {
  const sdk = {
    init: vi.fn(),
    isEnabled: () => true,
    captureException: vi.fn(() => 'event'),
    setUser: vi.fn(),
    addBreadcrumb: vi.fn(),
    flush: async () => true,
  };
  const monitoring = createMonitoring({
    sdk,
    enabled: true,
    dsn: 'https://key@host/1',
    environment: 'test',
  });
  monitoring.init();
  return { sdk, monitoring };
}

describe('monitoring bindings', () => {
  it('syncs initial auth, account switch and logout, then unsubscribes without retaining the user', () => {
    const { sdk, monitoring } = setup();
    const store = new AuthStore<{ id: string; email: string }>(() => {});
    const initial = store.state;
    const first = {
      ...initial,
      status: 'authenticated' as const,
      user: { id: 'one', email: 'private@example.com' },
    };
    store.patch(first);
    const unbind = bindAuthMonitoring(
      { getSnapshot: () => store.state, on: (listener) => store.on(listener) },
      monitoring,
      (user) => user.id,
    );
    expect(sdk.setUser).toHaveBeenLastCalledWith({ id: 'one' });
    const second = {
      ...first,
      user: { id: 'two', email: 'other@example.com' },
    };
    store.emit({
      type: 'login',
      state: second,
      origin: 'remote',
      identityChanged: true,
    });
    expect(sdk.setUser).toHaveBeenLastCalledWith({ id: 'two' });
    store.emit({
      type: 'logout',
      state: { ...initial, status: 'guest' },
      origin: 'local',
    });
    expect(sdk.setUser).toHaveBeenLastCalledWith(null);
    unbind();
    sdk.setUser.mockClear();
    sdk.addBreadcrumb.mockClear();
    store.emit({ type: 'ready', state: first });
    expect(sdk.setUser).not.toHaveBeenCalled();
    expect(sdk.addBreadcrumb).not.toHaveBeenCalled();
  });

  it('clears stale identity while restoring, on kick, and on effect-style remount', () => {
    const { sdk, monitoring } = setup();
    const store = new AuthStore<{ id: string }>(() => {});
    const firstDispose = bindAuthMonitoring(
      { getSnapshot: () => store.state, on: (listener) => store.on(listener) },
      monitoring,
      (user) => user.id,
    );
    expect(sdk.setUser).toHaveBeenLastCalledWith(null);
    firstDispose();
    const secondDispose = bindAuthMonitoring(
      { getSnapshot: () => store.state, on: (listener) => store.on(listener) },
      monitoring,
      (user) => user.id,
    );
    sdk.setUser.mockClear();
    store.emit({
      type: 'kick',
      state: { ...store.state, status: 'guest' },
      origin: 'remote',
      reason: 'unauthorized',
      error: null,
    });
    expect(sdk.setUser).toHaveBeenCalledExactlyOnceWith(null);
    secondDispose();
  });

  it('reports one final query error after retry, without leaking query keys or request bodies', async () => {
    const { sdk, monitoring } = setup();
    const client = createQueryClient();
    const unbind = bindQueryMonitoring(client, monitoring);
    const error = new HttpError(
      new Response(null, {
        status: 503,
        headers: { 'X-Request-Id': 'request-one' },
      }),
      {
        private: 'private',
      },
    );
    const queryFn = vi.fn().mockRejectedValue(error);
    await expect(
      client.fetchQuery({
        queryKey: ['user', 'private@example.com'],
        queryFn,
        retryDelay: 0,
      }),
    ).rejects.toBe(error);
    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(sdk.captureException).toHaveBeenCalledExactlyOnceWith(error, {
      tags: {
        source: 'query',
        request_id: 'request-one',
        'http.status_code': '503',
      },
    });
    unbind();
    client.clear();
  });

  it.each([
    new AuthError('session_changed'),
    new AuthError('aborted'),
    new CancelledError(),
    new HttpError(new Response(null, { status: 422 }), {}),
  ])('ignores expected/cancelled cache errors: %s', async (error) => {
    const { sdk, monitoring } = setup();
    const client = createQueryClient();
    const unbind = bindQueryMonitoring(client, monitoring);
    await expect(
      client
        .getMutationCache()
        .build(client, { mutationFn: () => Promise.reject(error) })
        .execute(undefined),
    ).rejects.toBe(error);
    expect(sdk.captureException).not.toHaveBeenCalled();
    unbind();
    client.clear();
  });

  it('captures mutations and releases both cache subscriptions', async () => {
    const { sdk, monitoring } = setup();
    const client = createQueryClient();
    const unbind = bindQueryMonitoring(client, monitoring);
    const error = new Error('bug');
    const failMutation = () =>
      client
        .getMutationCache()
        .build(client, { mutationFn: () => Promise.reject(error) })
        .execute(undefined);
    await expect(failMutation()).rejects.toBe(error);
    expect(sdk.captureException).toHaveBeenCalledExactlyOnceWith(error, {
      tags: { source: 'mutation' },
    });
    unbind();
    sdk.captureException.mockClear();
    await expect(failMutation()).rejects.toBe(error);
    await expect(
      client.fetchQuery({
        queryKey: ['unbound'],
        queryFn: () => Promise.reject(error),
        retry: false,
      }),
    ).rejects.toBe(error);
    expect(sdk.captureException).not.toHaveBeenCalled();
    client.clear();
  });
});
