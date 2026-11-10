// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from './errors';
import { AuthStore, isSessionBoundary } from './auth-store';
import { AuthService } from './auth-service';
import {
  createAuth,
  createServer,
  createSignedIn,
  createStrategy,
  deferred,
  flush,
  makeGrant,
  makeUser,
  SELF_ORIGIN,
  TARGET,
  TestBrowser,
  type TestGrant,
  type TestUser,
} from './testing/test-kit';
import type { AuthPersistence, PersistedSession } from './types';

const unauthorized = () => AuthError.fromStatus(401, { serverCode: 'REFRESH_EXPIRED' });
const networkDown = () => new TypeError('Failed to fetch');

describe('async session boundaries', () => {
  it('logout cancels a pending login after bootstrap has resolved to guest', async () => {
    const grant = deferred<TestGrant>();
    const { auth, strategy } = createAuth({ strategy: { login: vi.fn(() => grant.promise) } });
    await auth.bootstrap();
    expect(auth.getSnapshot().status).toBe('guest');
    const result = auth.login({}).catch((error: unknown) => error);
    await flush();
    expect(strategy.login).toHaveBeenCalledOnce();
    const logout = auth.logout();
    grant.resolve(makeGrant('cancelled'));
    expect(await result).toMatchObject({ code: 'session_changed' });
    await logout;
    expect(auth.getSnapshot().status).toBe('guest');
    auth.destroy();
  });
  it('rejects an old successful response if identity changes during assessment', async () => {
    const verdict = deferred<{ action: 'pass' }>();
    const assess = vi.fn(() => verdict.promise);
    const { auth } = await createSignedIn({ strategy: { assess } });
    const request = auth.execute(TARGET, async () => ({ status: 200 }));
    const outcome = request.catch((error: unknown) => error);
    await flush();
    expect(assess).toHaveBeenCalledOnce();
    await auth.establish(makeGrant('other', makeUser('other')));
    verdict.resolve({ action: 'pass' });
    expect(await outcome).toMatchObject({ code: 'session_changed' });
    auth.destroy();
  });

  it.each(['logout', 'destroy'] as const)('does not redirect after %s during SSO login', async (action) => {
    const redirect = deferred<{ redirectTo: string }>();
    const { auth, platform } = createAuth({ strategy: { login: vi.fn(() => redirect.promise) } });
    const outcome = auth.login({}).catch((error: unknown) => error);
    await flush();
    const stopped = auth[action]();
    redirect.resolve({ redirectTo: '/sso' });
    expect(await outcome).toMatchObject({ code: 'session_changed' });
    await stopped;
    expect(platform.navigated).toEqual([]);
    auth.destroy();
  });

  it('keeps orphan cleanup inside the session lock', async () => {
    const login = deferred<TestGrant>();
    const cleanup = deferred();
    const browser = new TestBrowser();
    const a = createAuth({ browser, strategy: {
      login: vi.fn(() => login.promise), logout: vi.fn(() => cleanup.promise),
    } });
    const first = a.auth.login({}).catch((error: unknown) => error);
    await flush();
    a.auth.destroy();
    login.resolve(makeGrant('orphan'));
    await flush();
    const b = createAuth({ browser });
    const second = b.auth.login({});
    await flush();
    expect(b.strategy.login).not.toHaveBeenCalled();
    cleanup.resolve();
    expect(await first).toMatchObject({ code: 'session_changed' });
    await second;
    expect(b.strategy.login).toHaveBeenCalledOnce();
    b.auth.destroy();
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('холодный старт', () => {
  it('сессии нет: гость и одно событие ready', async () => {
    const { auth, eventTypes } = createAuth();
    const state = await auth.bootstrap();
    expect(state.status).toBe('guest');
    expect(eventTypes()).toEqual(['ready']);
  });

  it('сессия восстановлена: authenticated и ready без login', async () => {
    const { auth, eventTypes, strategy } = createAuth({
      strategy: { restore: vi.fn(async () => makeGrant('t1')) },
    });
    const state = await auth.bootstrap();
    expect(state).toMatchObject({ status: 'authenticated', user: makeUser() });
    expect(eventTypes()).toEqual(['ready']);
    expect(strategy.restore).toHaveBeenCalledTimes(1);
  });

  it('параллельные вызовы получают один и тот же промис', async () => {
    const { auth, strategy } = createAuth();
    const a = auth.bootstrap();
    const b = auth.bootstrap();
    expect(a).toBe(b);
    await a;
    expect(strategy.restore).toHaveBeenCalledTimes(1);
  });

  it('после завершения повторный вызов ничего не делает', async () => {
    const { auth, strategy, eventTypes } = createAuth();
    await auth.bootstrap();
    await auth.bootstrap();
    expect(strategy.restore).toHaveBeenCalledTimes(1);
    expect(eventTypes()).toEqual(['ready']);
  });

  it.each([401, 403])('%i на холодном старте: гость, без kick', async (status) => {
    const { auth, eventTypes } = createAuth({
      strategy: {
        restore: vi.fn(async () => {
          throw AuthError.fromStatus(status);
        }),
      },
    });
    expect((await auth.bootstrap()).status).toBe('guest');
    expect(eventTypes()).toEqual(['ready']);
  });

  it('сеть упала: статус остаётся unknown с ошибкой, ready не приходит', async () => {
    const { auth, eventTypes } = createAuth({
      strategy: {
        restore: vi.fn(async () => {
          throw networkDown();
        }),
      },
    });
    const state = await auth.bootstrap();
    expect(state.status).toBe('unknown');
    expect(state.error?.code).toBe('network');
    expect(eventTypes()).toEqual([]);
    auth.destroy();
  });

  it('после сбоя сети сам повторяет запуск и восстанавливает сессию', async () => {
    vi.useFakeTimers();
    const restore = vi
      .fn<() => Promise<TestGrant | null>>()
      .mockRejectedValueOnce(networkDown())
      .mockResolvedValue(makeGrant('t1'));
    const { auth, eventTypes } = createAuth({ strategy: { restore } });
    await auth.bootstrap();
    expect(auth.getSnapshot().status).toBe('unknown');

    await vi.advanceTimersByTimeAsync(2_000);

    expect(auth.getSnapshot()).toMatchObject({ status: 'authenticated', error: null });
    expect(eventTypes()).toEqual(['ready']);
  });

  it('событие online запускает повтор сразу', async () => {
    const restore = vi
      .fn<() => Promise<TestGrant | null>>()
      .mockRejectedValueOnce(networkDown())
      .mockResolvedValue(null);
    const { auth, platform } = createAuth({ strategy: { restore } });
    await auth.bootstrap();
    platform.goOnline();
    await flush();
    expect(auth.getSnapshot().status).toBe('guest');
  });

  it('запрос до bootstrap сам запускает его и дожидается сессии', async () => {
    const gate = deferred<TestGrant | null>();
    const { auth } = createAuth({ strategy: { restore: vi.fn(() => gate.promise) } });
    const server = createServer('t1');

    const request = auth.execute(TARGET, server.send);
    await flush();
    expect(server.send).not.toHaveBeenCalled();

    gate.resolve(makeGrant('t1'));
    await expect(request).resolves.toEqual({ status: 200 });
    expect(server.received).toEqual(['Bearer t1']);
  });
});

describe('снимок состояния', () => {
  it('объект стабилен, пока состояние не менялось', async () => {
    const { auth } = createAuth();
    await auth.bootstrap();
    expect(auth.getSnapshot()).toBe(auth.getSnapshot());
  });

  it('запись без изменений не создаёт новый объект и не будит подписчиков', () => {
    const store = new AuthStore<TestUser>(vi.fn());
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.state;

    store.patch({ status: 'unknown', phase: 'idle', user: null });

    expect(store.state).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it('заморожен', async () => {
    const { auth } = createAuth();
    await auth.bootstrap();
    expect(Object.isFrozen(auth.getSnapshot())).toBe(true);
  });

  it('секрет не виден ни в снимке, ни в JSON сервиса', async () => {
    const { auth } = await createSignedIn({ token: 'super-secret-token' });
    expect(JSON.stringify(auth.getSnapshot())).not.toContain('super-secret-token');
    expect(JSON.stringify(auth)).not.toContain('super-secret-token');
  });

  it('getSnapshot и subscribe работают без привязки к объекту', async () => {
    const { auth } = createAuth();
    const { getSnapshot, subscribe } = auth;
    const listener = vi.fn();
    subscribe(listener);
    await auth.bootstrap();
    expect(getSnapshot().status).toBe('guest');
    expect(listener).toHaveBeenCalled();
  });
});

describe('обработка 401', () => {
  it('N параллельных 401: один refresh, все повторяются с новым токеном', async () => {
    const gate = deferred<TestGrant>();
    const { auth, strategy } = await createSignedIn({
      strategy: { renew: vi.fn(() => gate.promise) },
    });
    const server = createServer('renewed-token');

    const requests = Array.from({ length: 5 }, () => auth.execute(TARGET, server.send));
    await flush();
    expect(strategy.renew).toHaveBeenCalledTimes(1);

    gate.resolve(makeGrant('renewed-token'));
    await expect(Promise.all(requests)).resolves.toEqual(Array(5).fill({ status: 200 }));
    expect(server.received.filter((value) => value === 'Bearer renewed-token')).toHaveLength(5);
    expect(strategy.renew).toHaveBeenCalledTimes(1);
  });

  it('запрос, начатый во время refresh, ждёт его и уходит с новым токеном', async () => {
    const gate = deferred<TestGrant>();
    const { auth } = await createSignedIn({ strategy: { renew: vi.fn(() => gate.promise) } });
    const server = createServer('renewed-token');
    const first = auth.execute(TARGET, server.send);
    await flush();
    const second = auth.execute(TARGET, server.send);
    await flush();

    gate.resolve(makeGrant('renewed-token'));
    await Promise.all([first, second]);
    expect(server.received).toEqual([
      'Bearer first-token',
      'Bearer renewed-token',
      'Bearer renewed-token',
    ]);
  });

  it('опоздавший 401 на уже заменённый токен не вызывает второй refresh', async () => {
    const { auth, strategy } = await createSignedIn();
    const slow = deferred<{ status: number }>();
    const server = createServer('renewed-token');

    let sends = 0;
    const lateRequest = auth.execute(TARGET, (attempt) => {
      sends += 1;
      return sends === 1 ? slow.promise : server.send(attempt);
    });
    await flush();

    await auth.execute(TARGET, server.send);
    expect(strategy.renew).toHaveBeenCalledTimes(1);

    slow.resolve({ status: 401 });
    await expect(lateRequest).resolves.toEqual({ status: 200 });
    expect(strategy.renew).toHaveBeenCalledTimes(1);
  });

  it('сервер отверг refresh: один kick, ожидающие получают свой 401', async () => {
    const { auth, eventTypes, events } = await createSignedIn({
      strategy: {
        renew: vi.fn(async () => {
          throw unauthorized();
        }),
      },
    });
    const server = createServer();

    const results = await Promise.all(
      Array.from({ length: 3 }, () => auth.execute(TARGET, server.send)),
    );

    expect(results).toEqual(Array(3).fill({ status: 401 }));
    expect(auth.getSnapshot()).toMatchObject({ status: 'guest', user: null });
    expect(eventTypes()).toEqual(['kick']);
    expect(events[0]).toMatchObject({ reason: 'unauthorized', origin: 'local' });
  });

  it('сеть упала на refresh: сессия жива, ошибка повторяемая', async () => {
    const { auth, eventTypes } = await createSignedIn({
      strategy: {
        renew: vi.fn(async () => {
          throw networkDown();
        }),
      },
    });
    const server = createServer();

    const failure = await auth.execute(TARGET, server.send).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AuthError);
    expect((failure as AuthError).retryable).toBe(true);
    expect(auth.getSnapshot()).toMatchObject({ status: 'authenticated', phase: 'idle' });
    expect(auth.getSnapshot().error?.code).toBe('network');
    expect(eventTypes()).toEqual([]);
  });

  it('после сбоя refresh не долбит сервер, а ждёт паузу и восстанавливается', async () => {
    const renew = vi
      .fn<() => Promise<TestGrant>>()
      .mockRejectedValueOnce(networkDown())
      .mockResolvedValue(makeGrant('renewed-token'));
    const { auth, browser } = await createSignedIn({ strategy: { renew } });
    const server = createServer('renewed-token');

    await auth.execute(TARGET, server.send).catch(() => undefined);
    await auth.execute(TARGET, server.send).catch(() => undefined);
    expect(renew).toHaveBeenCalledTimes(1);

    browser.advance(2_000);
    await expect(auth.execute(TARGET, server.send)).resolves.toEqual({ status: 200 });
    expect(renew).toHaveBeenCalledTimes(2);
    expect(auth.getSnapshot().error).toBeNull();
  });

  it('пауза берётся из Retry-After', async () => {
    const renew = vi
      .fn<() => Promise<TestGrant>>()
      .mockRejectedValueOnce(AuthError.fromStatus(429, { retryAfterMs: 60_000 }))
      .mockResolvedValue(makeGrant('renewed-token'));
    const { auth, browser } = await createSignedIn({ strategy: { renew } });
    const server = createServer('renewed-token');

    await auth.execute(TARGET, server.send).catch(() => undefined);
    browser.advance(59_000);
    await auth.execute(TARGET, server.send).catch(() => undefined);
    expect(renew).toHaveBeenCalledTimes(1);

    browser.advance(2_000);
    await auth.execute(TARGET, server.send);
    expect(renew).toHaveBeenCalledTimes(2);
  });

  it('повтор ограничен одной попыткой: новый токен тоже отвергнут, значит kick', async () => {
    const { auth, strategy, eventTypes } = await createSignedIn();
    const server = createServer();

    await expect(auth.execute(TARGET, server.send)).resolves.toEqual({ status: 401 });

    expect(server.send).toHaveBeenCalledTimes(2);
    expect(strategy.renew).toHaveBeenCalledTimes(1);
    expect(eventTypes()).toEqual(['renewed', 'kick']);
  });

  it('стратегия без renew: 401 сразу закрывает сессию', async () => {
    const { auth, eventTypes } = await createSignedIn({ strategy: { renew: undefined } });
    const server = createServer();
    await auth.execute(TARGET, server.send);
    expect(server.send).toHaveBeenCalledTimes(1);
    expect(eventTypes()).toEqual(['kick']);
  });

  it('стратегия решает сама: 401 с кодом не про сессию проходит насквозь', async () => {
    const { auth, strategy, eventTypes } = await createSignedIn({
      strategy: {
        assess: async (response) => {
          const body = (await response.json()) as { code?: string };
          return response.status === 401 && body.code !== 'WRONG_PIN'
            ? { action: 'renew' }
            : { action: 'pass' };
        },
      },
    });
    const send = vi.fn(async () => ({
      status: 401,
      headers: new Headers(),
      data: { code: 'WRONG_PIN' },
    }));
    await auth.execute(TARGET, send);
    expect(strategy.renew).not.toHaveBeenCalled();
    expect(eventTypes()).toEqual([]);
  });

  it.each([403, 404, 500])('%i не трогает сессию', async (status) => {
    const { auth, strategy, eventTypes } = await createSignedIn();
    await auth.execute(TARGET, async () => ({ status }));
    expect(strategy.renew).not.toHaveBeenCalled();
    expect(eventTypes()).toEqual([]);
    expect(auth.getSnapshot().status).toBe('authenticated');
  });

  it('401 гостю не приводит ни к refresh, ни к kick', async () => {
    const { auth, strategy, eventTypes } = createAuth();
    await auth.bootstrap();
    await auth.execute(TARGET, async () => ({ status: 401 }));
    expect(strategy.renew).not.toHaveBeenCalled();
    expect(eventTypes()).toEqual(['ready']);
  });

  it('клиент, бросающий исключение на 401, тоже обрабатывается', async () => {
    const { auth, strategy } = await createSignedIn();
    let sends = 0;
    const result = await auth.execute(TARGET, async () => {
      sends += 1;
      if (sends === 1) throw Object.assign(new Error('401'), { response: { status: 401 } });
      return { status: 200 };
    });
    expect(result).toEqual({ status: 200 });
    expect(strategy.renew).toHaveBeenCalledTimes(1);
  });

  it('сетевая ошибка запроса не считается ответом сервера', async () => {
    const { auth, strategy } = await createSignedIn();
    await expect(
      auth.execute(TARGET, async () => {
        throw networkDown();
      }),
    ).rejects.toThrow('Failed to fetch');
    expect(strategy.renew).not.toHaveBeenCalled();
  });

  it('kick вручную закрывает сессию с указанной причиной', async () => {
    const { auth, events } = await createSignedIn();
    auth.kick('socket_revoked');
    expect(auth.getSnapshot().status).toBe('guest');
    expect(events[0]).toMatchObject({ type: 'kick', reason: 'socket_revoked' });
  });
});

describe('обновление токена заранее', () => {
  const TTL = 15 * 60_000;

  it('токен скоро истечёт: сначала refresh, потом запрос', async () => {
    const { auth, strategy, browser } = await createSignedIn({ ttlMs: TTL });
    const server = createServer('renewed-token');

    browser.advance(TTL - 10_000);
    await auth.execute(TARGET, server.send);

    expect(strategy.renew).toHaveBeenCalledTimes(1);
    expect(server.received).toEqual(['Bearer renewed-token']);
  });

  it('токен свежий: лишнего refresh нет', async () => {
    const { auth, strategy, browser } = await createSignedIn({ ttlMs: TTL });
    const server = createServer('first-token');
    browser.advance(60_000);
    await auth.execute(TARGET, server.send);
    expect(strategy.renew).not.toHaveBeenCalled();
  });

  it('refresh упал, но токен ещё действует: запрос всё равно уходит', async () => {
    const { auth, browser } = await createSignedIn({
      ttlMs: TTL,
      strategy: {
        renew: vi.fn(async () => {
          throw networkDown();
        }),
      },
    });
    const server = createServer('first-token');
    browser.advance(TTL - 10_000);
    await expect(auth.execute(TARGET, server.send)).resolves.toEqual({ status: 200 });
  });

  it('refresh упал и токен просрочен: запрос не отправляется, ошибка повторяемая', async () => {
    const { auth, browser } = await createSignedIn({
      ttlMs: TTL,
      strategy: {
        renew: vi.fn(async () => {
          throw networkDown();
        }),
      },
    });
    const server = createServer('first-token');
    browser.advance(TTL + 1);
    await expect(auth.execute(TARGET, server.send)).rejects.toMatchObject({ code: 'network' });
    expect(server.send).not.toHaveBeenCalled();
    expect(auth.getSnapshot().status).toBe('authenticated');
  });

  it('нулевой TTL от сервера не превращает каждый запрос в refresh', async () => {
    const { auth, strategy } = await createSignedIn({
      ttlMs: 0,
      strategy: { renew: vi.fn(async () => makeGrant('renewed-token', makeUser(), 0)) },
    });
    const server = createServer('first-token', 'renewed-token');
    await auth.execute(TARGET, server.send);
    await auth.execute(TARGET, server.send);
    await auth.execute(TARGET, server.send);
    expect(strategy.renew).not.toHaveBeenCalled();
  });

  it('сессии без срока обновляются только по 401', async () => {
    const { auth, strategy, browser } = await createSignedIn({ ttlMs: null });
    const server = createServer('first-token');
    browser.advance(365 * 24 * 3_600_000);
    await auth.execute(TARGET, server.send);
    expect(strategy.renew).not.toHaveBeenCalled();
  });
});

describe('отмена и таймауты', () => {
  it('отмена одного запроса не отменяет общий refresh', async () => {
    const gate = deferred<TestGrant>();
    const { auth, strategy } = await createSignedIn({
      strategy: { renew: vi.fn(() => gate.promise) },
    });
    const server = createServer('renewed-token');
    const controller = new AbortController();

    const cancelled = auth.execute(TARGET, server.send, { signal: controller.signal });
    const other = auth.execute(TARGET, server.send);
    await flush();

    controller.abort();
    await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
    expect(strategy.renew).toHaveBeenCalledTimes(1);

    gate.resolve(makeGrant('renewed-token'));
    await expect(other).resolves.toEqual({ status: 200 });
  });

  it('запрос с уже отменённым сигналом не уходит', async () => {
    const { auth } = await createSignedIn();
    const server = createServer('first-token');
    await expect(
      auth.execute(TARGET, server.send, { signal: AbortSignal.abort() }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(server.send).not.toHaveBeenCalled();
  });

  it('зависший refresh не запирает очередь и не закрывает сессию', async () => {
    vi.useFakeTimers();
    const { auth, eventTypes } = await createSignedIn({
      strategy: { renew: vi.fn(() => new Promise<TestGrant>(() => undefined)) },
      config: { operationTimeoutMs: 1_000 },
    });
    const server = createServer();

    const request = auth.execute(TARGET, server.send).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(await request).toMatchObject({ code: 'timeout', retryable: true });
    expect(auth.getSnapshot().status).toBe('authenticated');
    expect(eventTypes()).toEqual([]);
  });

  it('стратегия получает сигнал отмены при таймауте', async () => {
    vi.useFakeTimers();
    let received: AbortSignal | undefined;
    const { auth } = await createSignedIn({
      strategy: {
        renew: vi.fn(({ signal }) => {
          received = signal;
          return new Promise<TestGrant>(() => undefined);
        }),
      },
      config: { operationTimeoutMs: 1_000 },
    });
    void auth.execute(TARGET, createServer().send).catch(() => undefined);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(received?.aborted).toBe(true);
  });

  it('зависший fetchUser не блокирует следующие обновления', async () => {
    vi.useFakeTimers();
    const fetchUser = vi.fn(() => new Promise<TestUser>(() => undefined));
    const { auth } = await createSignedIn({
      config: { fetchUser, operationTimeoutMs: 1_000 },
    });
    void auth.refreshUser();
    await vi.advanceTimersByTimeAsync(1_000);
    void auth.refreshUser();
    expect(fetchUser).toHaveBeenCalledTimes(2);
    auth.destroy();
  });
});

describe('сессия сменилась, пока шла операция', () => {
  it('выход во время refresh: сессия не воскресает', async () => {
    const gate = deferred<TestGrant>();
    const { auth } = await createSignedIn({ strategy: { renew: vi.fn(() => gate.promise) } });
    const request = auth.execute(TARGET, createServer().send);
    await flush();

    const logout = auth.logout();
    expect(auth.getSnapshot().status).toBe('guest');
    gate.resolve(makeGrant('resurrected-token'));
    await Promise.all([request, logout]);
    await flush();

    expect(auth.getSnapshot()).toMatchObject({ status: 'guest', user: null });
  });

  it('выход, пока летит профиль: сессия не воскресает и данные не пишутся', async () => {
    const gate = deferred<TestUser>();
    const save = vi.fn();
    const { auth } = await createSignedIn({
      config: {
        fetchUser: () => gate.promise,
        persistence: { load: () => null, save, clear: vi.fn() },
      },
    });
    const refresh = auth.refreshUser();
    await auth.logout();
    save.mockClear();

    gate.resolve(makeUser('anna', 'Анна'));
    await refresh;
    await flush();

    expect(auth.getSnapshot()).toMatchObject({ status: 'guest', user: null });
    expect(save).not.toHaveBeenCalled();
  });

  it('вход другого пользователя, пока летит профиль прошлого: чужой профиль не применяется', async () => {
    const oldProfile = deferred<TestUser>();
    const fetchUser = vi
      .fn<() => Promise<TestUser>>()
      .mockReturnValueOnce(oldProfile.promise)
      .mockResolvedValue(makeUser('boris'));
    const { auth } = await createSignedIn({ config: { fetchUser } });

    void auth.refreshUser();
    await auth.establish(makeGrant('boris-token', null));
    await flush();
    expect(fetchUser).toHaveBeenCalledTimes(2);

    oldProfile.resolve(makeUser('anna'));
    await flush();
    expect(auth.getSnapshot().user?.id).toBe('boris');
  });

  it('ответ закрытой сессии отвергается, а не отдаётся приложению', async () => {
    const gate = deferred<{ status: number }>();
    const { auth } = await createSignedIn();
    const request = auth.execute(TARGET, () => gate.promise);
    await flush();

    await auth.logout();
    gate.resolve({ status: 200 });

    await expect(request).rejects.toMatchObject({ code: 'session_changed' });
  });

  it('запрос прошлого пользователя не повторяется от имени нового', async () => {
    const renewGate = deferred<TestGrant>();
    const { auth } = await createSignedIn({
      strategy: { renew: vi.fn(() => renewGate.promise) },
    });
    const server = createServer('boris-token');
    const request = auth.execute(TARGET, server.send);
    await flush();
    expect(server.send).toHaveBeenCalledTimes(1);

    await auth.establish(makeGrant('boris-token', makeUser('boris')));
    renewGate.resolve(makeGrant('anna-renewed'));
    await request.catch(() => undefined);
    await flush();

    expect(server.send).toHaveBeenCalledTimes(1);
  });

  it('опоздавший 401 старого токена не убивает новую сессию', async () => {
    const slow = deferred<{ status: number }>();
    const { auth, eventTypes } = await createSignedIn();
    const late = auth.execute(TARGET, () => slow.promise);
    await flush();

    await auth.establish(makeGrant('boris-token', makeUser('boris')));
    slow.resolve({ status: 401 });

    await expect(late).resolves.toEqual({ status: 401 });
    expect(auth.getSnapshot()).toMatchObject({ status: 'authenticated', user: { id: 'boris' } });
    expect(eventTypes()).not.toContain('kick');
  });

  it('выход во время входа: сессия на сервере закрывается', async () => {
    const gate = deferred<TestGrant>();
    const { auth, strategy } = await createSignedIn({
      strategy: { login: vi.fn(() => gate.promise) },
    });
    const login = auth.login({});
    await flush();
    const logout = auth.logout();

    gate.resolve(makeGrant('orphan-token'));

    await expect(login).rejects.toMatchObject({ code: 'session_changed' });
    await logout;
    expect(strategy.logout).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: 'orphan-token' }),
    );
    expect(auth.getSnapshot().status).toBe('guest');
  });

  it('destroy во время входа: сессия на сервере закрывается', async () => {
    const gate = deferred<TestGrant>();
    const { auth, strategy } = createAuth({ strategy: { login: vi.fn(() => gate.promise) } });
    const login = auth.login({});
    await flush();
    auth.destroy();
    gate.resolve(makeGrant('orphan-token'));

    await expect(login).rejects.toMatchObject({ code: 'session_changed' });
    expect(strategy.logout).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: 'orphan-token' }),
    );
  });

  it('вход не отменяется тем, что параллельно закончилось восстановление сессии', async () => {
    const restore = deferred<TestGrant | null>();
    const { auth } = createAuth({ strategy: { restore: vi.fn(() => restore.promise) } });
    void auth.bootstrap();
    const login = auth.login({});
    restore.resolve(null);
    await expect(login).resolves.toMatchObject({ status: 'authenticated' });
  });

  it('refresh вернул другого пользователя: граница сессии, старые запросы не повторяются', async () => {
    const { auth, events } = await createSignedIn({
      strategy: { renew: vi.fn(async () => makeGrant('boris-token', makeUser('boris'))) },
    });
    const server = createServer('boris-token');

    await expect(auth.execute(TARGET, server.send)).rejects.toMatchObject({
      code: 'session_changed',
    });

    expect(server.send).toHaveBeenCalledTimes(1);
    expect(auth.getSnapshot().user?.id).toBe('boris');
    const login = events.find((event) => event.type === 'login');
    expect(login).toMatchObject({ identityChanged: true });
    expect(isSessionBoundary(login!)).toBe(true);
  });
});

describe('вход', () => {
  it('успех: login, снимок, данные пользователя', async () => {
    const { auth, eventTypes } = createAuth();
    await auth.bootstrap();
    const state = await auth.login({ email: 'a@b.c' });
    expect(state).toMatchObject({ status: 'authenticated', phase: 'idle', user: makeUser() });
    expect(eventTypes()).toEqual(['ready', 'login']);
  });

  it('неверный пароль: ошибка наружу, гость остаётся гостем и без kick', async () => {
    const { auth, eventTypes } = createAuth({
      strategy: {
        login: vi.fn(async () => {
          throw AuthError.fromStatus(401, { serverCode: 'INVALID_CREDENTIALS' });
        }),
      },
    });
    await auth.bootstrap();

    await expect(auth.login({})).rejects.toMatchObject({
      code: 'unauthorized',
      serverCode: 'INVALID_CREDENTIALS',
    });

    expect(auth.getSnapshot()).toMatchObject({ status: 'guest', phase: 'idle' });
    expect(eventTypes()).toEqual(['ready']);
  });

  it('неверный пароль при открытой сессии её не закрывает', async () => {
    const { auth } = await createSignedIn({
      strategy: {
        login: vi.fn(async () => {
          throw AuthError.fromStatus(401);
        }),
      },
    });
    await auth.login({}).catch(() => undefined);
    expect(auth.getSnapshot().status).toBe('authenticated');
  });

  it('двойной клик по кнопке: один запрос', async () => {
    const gate = deferred<TestGrant>();
    const { auth, strategy } = createAuth({ strategy: { login: vi.fn(() => gate.promise) } });
    const a = auth.login({});
    const b = auth.login({});
    expect(a).toBe(b);
    gate.resolve(makeGrant('t1'));
    await a;
    expect(strategy.login).toHaveBeenCalledTimes(1);
  });

  it('вход другим пользователем поверх сессии отмечается как смена личности', async () => {
    const { auth, events } = await createSignedIn({
      strategy: { login: vi.fn(async () => makeGrant('boris-token', makeUser('boris'))) },
    });
    await auth.login({});
    expect(events.at(-1)).toMatchObject({ type: 'login', identityChanged: true });
  });

  it('без identify смена личности считается случившейся', async () => {
    const { auth, events } = await createSignedIn({ config: { identify: undefined } });
    await auth.login({});
    expect(events.at(-1)).toMatchObject({ type: 'login', identityChanged: true });
  });

  it('ответ без пользователя догружает профиль', async () => {
    const fetchUser = vi.fn(async () => makeUser('boris'));
    const { auth } = createAuth({
      strategy: { login: vi.fn(async () => makeGrant('t1', null)) },
      config: { fetchUser },
    });
    await auth.login({});
    await flush();
    expect(auth.getSnapshot().user?.id).toBe('boris');
  });

  it('establish открывает сессию из внешнего сценария', async () => {
    const { auth, eventTypes } = createAuth();
    await auth.bootstrap();
    const state = await auth.establish(makeGrant('sms-token'));
    expect(state.status).toBe('authenticated');
    expect(eventTypes()).toEqual(['ready', 'login']);
  });

  it('редирект: браузер уводится, сессия не меняется', async () => {
    const { auth, platform } = createAuth({
      strategy: { login: vi.fn(async () => ({ redirectTo: '/api/auth/google/start' })) },
    });
    await auth.bootstrap();
    const state = await auth.login({});
    expect(platform.navigated).toEqual([`${SELF_ORIGIN}/api/auth/google/start`]);
    expect(state).toMatchObject({ status: 'guest', phase: 'redirecting' });
  });

  it('неудачный редирект не оставляет сервис в фазе redirecting', async () => {
    const { auth, platform } = createAuth({
      strategy: { login: vi.fn(async () => ({ redirectTo: '/sso' })) },
    });
    await auth.bootstrap();
    platform.navigate = () => {
      throw new AuthError('misconfigured');
    };
    await expect(auth.login({})).rejects.toMatchObject({ code: 'misconfigured' });
    expect(auth.getSnapshot().phase).toBe('idle');
  });

  it('свой клиент без статуса в результате не ломает конвейер', async () => {
    const { auth, strategy } = await createSignedIn();
    await expect(auth.execute(TARGET, async () => 'plain-text')).resolves.toBe('plain-text');
    expect(strategy.renew).not.toHaveBeenCalled();
  });

  it('редирект на чужой адрес запрещён', async () => {
    const { auth, platform } = createAuth({
      strategy: { login: vi.fn(async () => ({ redirectTo: 'https://evil.test/phish' })) },
    });
    await auth.bootstrap();
    await expect(auth.login({})).rejects.toMatchObject({ code: 'misconfigured' });
    expect(platform.navigated).toEqual([]);
    expect(auth.getSnapshot().phase).toBe('idle');
  });

  it('javascript: в редиректе запрещён', async () => {
    const { auth, platform } = createAuth({
      strategy: { login: vi.fn(async () => ({ redirectTo: 'javascript:alert(1)' })) },
    });
    await auth.bootstrap();
    await expect(auth.login({})).rejects.toMatchObject({ code: 'misconfigured' });
    expect(platform.navigated).toEqual([]);
  });

  it('провайдер SSO разрешается через redirectOrigins', async () => {
    const { auth, platform } = createAuth({
      strategy: { login: vi.fn(async () => ({ redirectTo: 'https://sso.corp.test/start' })) },
      config: { redirectOrigins: ['https://sso.corp.test'] },
    });
    await auth.bootstrap();
    await auth.login({});
    expect(platform.navigated).toEqual(['https://sso.corp.test/start']);
  });
});

describe('выход', () => {
  it('локально сессия закрывается сразу, не дожидаясь сервера', async () => {
    const gate = deferred();
    const { auth, eventTypes } = await createSignedIn({
      strategy: { logout: vi.fn(() => gate.promise) },
    });
    const logout = auth.logout();

    expect(auth.getSnapshot().status).toBe('guest');
    expect(eventTypes()).toEqual(['logout']);

    gate.resolve();
    await logout;
  });

  it('новые запросы после выхода идут без токена, пока сервер ещё думает', async () => {
    const gate = deferred();
    const { auth } = await createSignedIn({ strategy: { logout: vi.fn(() => gate.promise) } });
    void auth.logout();
    const server = createServer();
    await auth.execute(TARGET, server.send);
    expect(server.received).toEqual([null]);
    gate.resolve();
  });

  it('вызывающий logout не ждёт очередь за зависшим refresh', async () => {
    vi.useFakeTimers();
    const { auth } = await createSignedIn({
      strategy: { renew: vi.fn(() => new Promise<TestGrant>(() => undefined)) },
      config: { logoutTimeoutMs: 500 },
    });
    void auth.execute(TARGET, createServer().send).catch(() => undefined);
    await vi.advanceTimersByTimeAsync(0);

    const logout = auth.logout();
    await vi.advanceTimersByTimeAsync(500);

    await expect(logout).resolves.toMatchObject({ status: 'guest' });
  });

  it('зависший logout заканчивается по таймауту', async () => {
    vi.useFakeTimers();
    const { auth } = await createSignedIn({
      strategy: { logout: vi.fn(() => new Promise<void>(() => undefined)) },
      config: { logoutTimeoutMs: 500 },
    });
    const logout = auth.logout();
    await vi.advanceTimersByTimeAsync(500);
    await expect(logout).resolves.toMatchObject({ status: 'guest' });
  });

  it('стратегия получает реквизиты закрываемой сессии', async () => {
    const { auth, strategy } = await createSignedIn();
    await auth.logout();
    expect(strategy.logout).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: 'first-token' }),
    );
  });

  it('сервер недоступен: при следующем старте сессия не поднимается, выход довершается', async () => {
    const browser = new TestBrowser();
    const firstTab = await createSignedIn({
      browser,
      strategy: {
        logout: vi.fn(async () => {
          throw networkDown();
        }),
      },
    });
    await firstTab.auth.logout();
    firstTab.auth.destroy();

    const logout = vi.fn(async () => undefined);
    const restore = vi.fn(async () => makeGrant('cookie-still-valid'));
    const reloaded = createAuth({ browser, strategy: { logout, restore } });
    const state = await reloaded.auth.bootstrap();

    expect(logout).toHaveBeenCalledWith(expect.objectContaining({ credentials: null }));
    expect(state.status).toBe('authenticated');
    expect(restore).toHaveBeenCalledTimes(1);
    expect(browser.markers.size).toBe(0);
  });

  it('сервер всё ещё недоступен: остаёмся гостем и не трогаем живую cookie', async () => {
    const browser = new TestBrowser();
    browser.markers.add('test:pending-logout');
    const restore = vi.fn(async () => makeGrant('cookie-still-valid'));
    const { auth } = createAuth({
      browser,
      strategy: {
        restore,
        logout: vi.fn(async () => {
          throw networkDown();
        }),
      },
    });

    const state = await auth.bootstrap();

    expect(state.status).toBe('guest');
    expect(restore).not.toHaveBeenCalled();
    expect(browser.markers.has('test:pending-logout')).toBe(true);
  });

  it('с появлением сети отложенный выход довершается', async () => {
    const browser = new TestBrowser();
    browser.markers.add('test:pending-logout');
    const logout = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(networkDown())
      .mockResolvedValue(undefined);
    const { auth, platform } = createAuth({ browser, strategy: { logout } });
    await auth.bootstrap();

    platform.goOnline();
    await flush();

    expect(browser.markers.size).toBe(0);
  });

  it('401 на logout значит, что сессии и так нет: флаг снимается', async () => {
    const { auth, browser } = await createSignedIn({
      strategy: {
        logout: vi.fn(async () => {
          throw unauthorized();
        }),
      },
    });
    await auth.logout();
    expect(browser.markers.size).toBe(0);
  });

  it('успешный вход снимает отложенный выход', async () => {
    const browser = new TestBrowser();
    browser.markers.add('test:pending-logout');
    const { auth } = createAuth({
      browser,
      strategy: {
        logout: vi.fn(async () => {
          throw networkDown();
        }),
      },
    });
    await auth.bootstrap();
    await auth.login({});
    expect(browser.markers.size).toBe(0);
  });

  it('повторный logout не шлёт второй запрос', async () => {
    const { auth, strategy } = await createSignedIn();
    await Promise.all([auth.logout(), auth.logout()]);
    await auth.logout();
    expect(strategy.logout).toHaveBeenCalledTimes(1);
  });

  it('гостю выходить неоткуда', async () => {
    const { auth, strategy, eventTypes } = createAuth();
    await auth.bootstrap();
    await auth.logout();
    expect(strategy.logout).not.toHaveBeenCalled();
    expect(eventTypes()).toEqual(['ready']);
  });

  it('серверный выход встаёт в очередь за идущим refresh', async () => {
    const renewGate = deferred<TestGrant>();
    const order: string[] = [];
    const { auth } = await createSignedIn({
      strategy: {
        renew: vi.fn(async () => {
          order.push('renew:start');
          const grant = await renewGate.promise;
          order.push('renew:end');
          return grant;
        }),
        logout: vi.fn(async () => {
          order.push('logout');
        }),
      },
    });
    void auth.execute(TARGET, createServer().send).catch(() => undefined);
    await flush();
    const logout = auth.logout();
    await flush();
    expect(order).toEqual(['renew:start']);

    renewGate.resolve(makeGrant('rotated'));
    await logout;
    expect(order).toEqual(['renew:start', 'renew:end', 'logout']);
  });
});

describe('куда уходят реквизиты', () => {
  it('чужой origin: без заголовков и без ожидания сессии', async () => {
    const { auth, strategy } = createAuth();
    const send = vi.fn(async () => ({ status: 200 }));
    await auth.execute({ url: 'https://cdn.other.test/a.json', method: 'GET' }, send);
    expect(send.mock.calls[0]).toEqual([expect.objectContaining({ headers: {} })]);
    expect(strategy.restore).not.toHaveBeenCalled();
  });

  it('401 с чужого origin не трогает сессию', async () => {
    const { auth, strategy, eventTypes } = await createSignedIn();
    await auth.execute({ url: 'https://other.test/x', method: 'GET' }, async () => ({ status: 401 }));
    expect(strategy.renew).not.toHaveBeenCalled();
    expect(eventTypes()).toEqual([]);
  });

  it('http-версия доверенного origin считается чужой', async () => {
    const { auth } = await createSignedIn();
    const send = vi.fn(async () => ({ status: 200 }));
    await auth.execute({ url: 'http://app.test/api', method: 'GET' }, send);
    expect(send.mock.calls[0]).toEqual([expect.objectContaining({ headers: {} })]);
  });

  it('поддомен доверенного origin считается чужим', async () => {
    const { auth } = await createSignedIn();
    const send = vi.fn(async () => ({ status: 200 }));
    await auth.execute({ url: 'https://evil.app.test/api', method: 'GET' }, send);
    expect(send.mock.calls[0]).toEqual([expect.objectContaining({ headers: {} })]);
  });

  it('доменное имя с доверенным origin в начале не проходит', async () => {
    const { auth } = await createSignedIn();
    const send = vi.fn(async () => ({ status: 200 }));
    await auth.execute({ url: 'https://app.test.evil.io/api', method: 'GET' }, send);
    expect(send.mock.calls[0]).toEqual([expect.objectContaining({ headers: {} })]);
  });

  it('относительный URL относится к своему origin', async () => {
    const { auth } = await createSignedIn();
    const server = createServer('first-token');
    await auth.execute({ url: '/api/tasks', method: 'GET' }, server.send);
    expect(server.received).toEqual(['Bearer first-token']);
  });

  it('явно разрешённый origin получает токен', async () => {
    const { auth } = await createSignedIn({ config: { trustedOrigins: ['https://api.test'] } });
    const server = createServer('first-token');
    await auth.execute({ url: 'https://api.test/x', method: 'GET' }, server.send);
    expect(server.received).toEqual(['Bearer first-token']);
  });

  it('skip отправляет запрос без подписи', async () => {
    const { auth } = await createSignedIn();
    const server = createServer();
    await auth.execute(TARGET, server.send, { skip: true });
    expect(server.received).toEqual([null]);
  });

  it.each([
    ['маска', 'https://*.corp.test'],
    ['путь', 'https://api.test/v1'],
    ['слэш на конце', 'https://api.test/'],
    ['http не на localhost', 'http://api.test'],
    ['мусор', 'not a url'],
  ])('опасная настройка trustedOrigins (%s) падает сразу', (_, origin) => {
    expect(
      () => new AuthService({ strategy: createStrategy(), trustedOrigins: [origin] }),
    ).toThrow(AuthError);
  });

  it('неверный baseUrl падает сразу', () => {
    expect(() => new AuthService({ strategy: createStrategy(), baseUrl: 'not a url' })).toThrow(
      AuthError,
    );
  });

  it('http на localhost разрешён для разработки', () => {
    expect(
      () =>
        new AuthService({ strategy: createStrategy(), trustedOrigins: ['http://localhost:3000'] }),
    ).not.toThrow();
  });

  it('allowInsecureOrigins разрешает http явно', () => {
    expect(
      () =>
        new AuthService({
          strategy: createStrategy(),
          trustedOrigins: ['http://10.0.0.5:3000'],
          allowInsecureOrigins: true,
        }),
    ).not.toThrow();
  });
});

describe('несколько вкладок', () => {
  it('выход в одной вкладке закрывает остальные без лишнего запроса', async () => {
    const browser = new TestBrowser();
    const a = await createSignedIn({ browser });
    const b = await createSignedIn({ browser });

    await a.auth.logout();
    await flush();

    expect(b.auth.getSnapshot().status).toBe('guest');
    expect(b.events[0]).toMatchObject({ type: 'logout', origin: 'remote' });
    expect(b.strategy.logout).not.toHaveBeenCalled();
  });

  it('kick в одной вкладке закрывает остальные', async () => {
    const browser = new TestBrowser();
    const a = await createSignedIn({
      browser,
      strategy: {
        renew: vi.fn(async () => {
          throw unauthorized();
        }),
      },
    });
    const b = await createSignedIn({ browser });

    await a.auth.execute(TARGET, createServer().send);
    await flush();

    expect(b.events[0]).toMatchObject({ type: 'kick', origin: 'remote', reason: 'unauthorized' });
    expect(b.auth.getSnapshot().status).toBe('guest');
  });

  it('вход в одной вкладке поднимает сессию в гостевой', async () => {
    const browser = new TestBrowser();
    const a = createAuth({ browser });
    const b = createAuth({
      browser,
      strategy: {
        restore: vi.fn<() => Promise<TestGrant | null>>().mockResolvedValueOnce(null).mockResolvedValue(makeGrant('own-token')),
      },
    });
    await a.auth.bootstrap();
    await b.auth.bootstrap();

    await a.auth.login({});
    await flush();

    expect(b.auth.getSnapshot().status).toBe('authenticated');
    expect(b.events.at(-1)).toMatchObject({ type: 'login', origin: 'remote' });
  });

  it('другой пользователь вошёл в соседней вкладке: граница сессии здесь тоже', async () => {
    const browser = new TestBrowser();
    const a = await createSignedIn({
      browser,
      strategy: { login: vi.fn(async () => makeGrant('boris-a', makeUser('boris'))) },
    });
    const b = await createSignedIn({
      browser,
      strategy: {
        restore: vi
          .fn<() => Promise<TestGrant | null>>()
          .mockResolvedValueOnce(makeGrant('anna-b'))
          .mockResolvedValue(makeGrant('boris-b', makeUser('boris'))),
      },
    });

    await a.auth.login({});
    await flush();

    expect(b.auth.getSnapshot().user?.id).toBe('boris');
    const event = b.events.find((item) => item.type === 'login');
    expect(event).toMatchObject({ identityChanged: true });
    expect(isSessionBoundary(event!)).toBe(true);
  });

  it('тот же пользователь вошёл в соседней вкладке: лишних запросов нет', async () => {
    const browser = new TestBrowser();
    const a = await createSignedIn({ browser });
    const restore = vi.fn(async () => makeGrant('own-token'));
    await createSignedIn({ browser, strategy: { restore } });
    restore.mockClear();

    await a.auth.login({});
    await flush();

    expect(restore).not.toHaveBeenCalled();
  });

  it('refresh в разных вкладках идёт строго по очереди', async () => {
    const browser = new TestBrowser();
    let active = 0;
    let peak = 0;
    const gates = [deferred<TestGrant>(), deferred<TestGrant>()];
    let calls = 0;
    const renew = vi.fn(async () => {
      active += 1;
      peak = Math.max(peak, active);
      const grant = await gates[calls++]!.promise;
      active -= 1;
      return grant;
    });
    const a = await createSignedIn({ browser, strategy: { renew } });
    const b = await createSignedIn({ browser, strategy: { renew } });

    const first = a.auth.execute(TARGET, createServer('a2').send);
    const second = b.auth.execute(TARGET, createServer('b2').send);
    await flush();
    expect(renew).toHaveBeenCalledTimes(1);

    gates[0]!.resolve(makeGrant('a2'));
    await first;
    await flush();
    expect(renew).toHaveBeenCalledTimes(2);

    gates[1]!.resolve(makeGrant('b2'));
    await second;
    expect(peak).toBe(1);
  });

  it('старт нескольких вкладок сразу тоже идёт по очереди', async () => {
    const browser = new TestBrowser();
    let active = 0;
    let peak = 0;
    const restore = vi.fn(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await flush(5);
      active -= 1;
      return makeGrant('t');
    });
    const tabs = Array.from({ length: 4 }, () => createAuth({ browser, strategy: { restore } }));
    await Promise.all(tabs.map((tab) => tab.auth.bootstrap()));
    expect(restore).toHaveBeenCalledTimes(4);
    expect(peak).toBe(1);
  });

  it('токен не передаётся между вкладками', async () => {
    const browser = new TestBrowser();
    const sent: unknown[] = [];
    const a = await createSignedIn({ browser, token: 'secret-a' });
    const spy = browser.openChannel('test:tabs');
    spy.subscribe((message) => sent.push(message));

    await a.auth.login({});
    await a.auth.logout();
    await flush();

    expect(sent.length).toBeGreaterThan(0);
    expect(JSON.stringify(sent)).not.toMatch(/token|secret/);
  });

  it.each([null, 'x', 42, {}, { type: 'kick' }, { type: 'login', identity: 5 }, { type: 'nope' }])(
    'мусор в канале (%j) игнорируется',
    async (garbage) => {
      const browser = new TestBrowser();
      const { auth } = await createSignedIn({ browser });
      browser.openChannel('test:tabs').post(garbage);
      await flush();
      expect(auth.getSnapshot().status).toBe('authenticated');
    },
  );

  it('занятая блокировка даёт unknown с таймаутом без обхода очереди', async () => {
    vi.useFakeTimers();
    const browser = new TestBrowser();
    void browser.locks.run('test:session', () => new Promise(() => undefined), 60_000);
    const { auth, strategy } = createAuth({ browser, config: { operationTimeoutMs: 1_000 } });

    const boot = auth.bootstrap();
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(boot).resolves.toMatchObject({ status: 'unknown', error: { code: 'timeout' } });
    expect(strategy.restore).not.toHaveBeenCalled();
    auth.destroy();
  });
});

describe('подписчики', () => {
  it('упавший подписчик не ломает поток и не мешает остальным', async () => {
    const onListenerError = vi.fn();
    const { auth } = await createSignedIn({ config: { onListenerError } });
    const second = vi.fn();
    auth.on(() => {
      throw new Error('broken listener');
    });
    auth.on(second);

    await expect(auth.logout()).resolves.toMatchObject({ status: 'guest' });
    expect(second).toHaveBeenCalledTimes(1);
    expect(onListenerError).toHaveBeenCalledTimes(1);
  });

  it('отписка во время рассылки не теряет остальных', async () => {
    const { auth } = createAuth();
    const second = vi.fn();
    const unsubscribe = auth.on(() => unsubscribe());
    auth.on(second);
    await auth.bootstrap();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('вложенное действие внутри подписчика сохраняет порядок событий', async () => {
    const { auth } = await createSignedIn();
    const seen: string[] = [];
    auth.on((event) => {
      if (event.type === 'user') void auth.logout();
    });
    auth.on((event) => seen.push(event.type));
    auth.patchUser({ name: 'Новое' });
    await flush();
    expect(seen).toEqual(['user', 'logout']);
  });

  it('после отписки события не приходят', async () => {
    const { auth } = createAuth();
    const listener = vi.fn();
    auth.subscribe(listener)();
    await auth.bootstrap();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('данные пользователя', () => {
  it('patchUser объединяет поля и пропускает undefined', async () => {
    const { auth, eventTypes } = await createSignedIn();
    auth.patchUser({ name: 'Анна', id: undefined });
    expect(auth.getSnapshot().user).toEqual({ id: 'anna', name: 'Анна' });
    expect(eventTypes()).toEqual(['user']);
  });

  it('patchUser без значимых полей и у гостя ничего не делает', async () => {
    const guest = createAuth();
    await guest.auth.bootstrap();
    guest.auth.patchUser({ name: 'X' });
    expect(guest.auth.getSnapshot().user).toBeNull();

    const { auth, eventTypes } = await createSignedIn();
    auth.patchUser({});
    auth.patchUser({ name: undefined });
    expect(eventTypes()).toEqual([]);
  });

  it('patchUser устойчив к __proto__', async () => {
    const { auth } = await createSignedIn();
    auth.patchUser(JSON.parse('{"__proto__":{"isAdmin":true}}') as Partial<TestUser>);
    expect(({} as { isAdmin?: boolean }).isAdmin).toBeUndefined();
    expect((auth.getSnapshot().user as unknown as { isAdmin?: boolean }).isAdmin).toBeUndefined();
  });

  it('refreshUser обновляет данные, параллельные вызовы объединяются', async () => {
    const fetchUser = vi.fn(async () => makeUser('anna', 'Свежая'));
    const { auth, eventTypes } = await createSignedIn({ config: { fetchUser } });
    const a = auth.refreshUser();
    const b = auth.refreshUser();
    expect(a).toBe(b);
    await a;
    expect(fetchUser).toHaveBeenCalledTimes(1);
    expect(auth.getSnapshot().user?.name).toBe('Свежая');
    expect(eventTypes()).toEqual(['user']);
  });

  it('ошибка сети при обновлении профиля оставляет старые данные', async () => {
    const { auth, eventTypes } = await createSignedIn({
      config: {
        fetchUser: async () => {
          throw networkDown();
        },
      },
    });
    await auth.refreshUser();
    expect(auth.getSnapshot()).toMatchObject({ status: 'authenticated', user: makeUser() });
    expect(eventTypes()).toEqual([]);
  });

  it('fetchUser ходит через авторизованный fetch: сессия обновляется сама', async () => {
    const { auth } = await createSignedIn();
    const context = await new Promise<{ fetch: unknown }>((resolve) => {
      const service = new AuthService<TestUser, unknown, string>({
        strategy: createStrategy(),
        platform: createAuth().platform,
        fetchUser: async (ctx) => {
          resolve(ctx);
          return makeUser();
        },
      });
      void service.establish(makeGrant('t', null));
    });
    expect(typeof context.fetch).toBe('function');
    auth.destroy();
  });

  it('assessUser закрывает сессию на холодном старте, ready всё равно приходит', async () => {
    const { auth, eventTypes, events } = createAuth({
      strategy: { restore: vi.fn(async () => makeGrant('t1')) },
      config: { assessUser: () => 'account_deleted' },
    });
    await auth.bootstrap();
    expect(auth.getSnapshot().status).toBe('guest');
    expect(eventTypes()).toEqual(['kick', 'ready']);
    expect(events[0]).toMatchObject({ reason: 'account_deleted' });
  });

  it('assessUser закрывает сессию при обновлении профиля', async () => {
    const { auth, eventTypes } = await createSignedIn({
      config: {
        fetchUser: async () => makeUser('anna', 'deleted'),
        assessUser: (user) => (user.name === 'deleted' ? 'account_deleted' : null),
      },
    });
    await auth.refreshUser();
    expect(eventTypes()).toEqual(['kick']);
  });

  it('поллинг: проверяет профиль, скрытую вкладку пропускает', async () => {
    vi.useFakeTimers();
    const fetchUser = vi.fn(async () => makeUser());
    const { auth, platform } = await createSignedIn({
      config: { fetchUser, pollIntervalMs: 1_000 },
    });
    auth.startPolling();

    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetchUser).toHaveBeenCalledTimes(1);

    platform.visible = false;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchUser).toHaveBeenCalledTimes(1);

    auth.destroy();
    platform.visible = true;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchUser).toHaveBeenCalledTimes(1);
  });

  it('поллинг у гостя ничего не делает', async () => {
    vi.useFakeTimers();
    const fetchUser = vi.fn(async () => makeUser());
    const { auth } = createAuth({ config: { fetchUser, pollIntervalMs: 1_000 } });
    await auth.bootstrap();
    auth.startPolling();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(fetchUser).not.toHaveBeenCalled();
    auth.destroy();
  });

  it('возврат на вкладку перепроверяет устаревший профиль', async () => {
    const fetchUser = vi.fn(async () => makeUser());
    const { auth, platform, browser } = await createSignedIn({
      config: { fetchUser, revalidateAfterMs: 60_000 },
    });
    await auth.refreshUser();
    fetchUser.mockClear();

    platform.resume();
    expect(fetchUser).not.toHaveBeenCalled();

    browser.advance(61_000);
    platform.resume();
    expect(fetchUser).toHaveBeenCalledTimes(1);
  });

  it('возврат из bfcache сверяет сессию: там могли уже выйти', async () => {
    const { auth, platform, eventTypes, strategy } = await createSignedIn({
      strategy: {
        restore: vi
          .fn<() => Promise<TestGrant | null>>()
          .mockResolvedValueOnce(makeGrant('t1'))
          .mockResolvedValue(null),
      },
    });
    platform.resume({ restoredFromCache: true });
    await flush();
    expect(strategy.restore).toHaveBeenCalledTimes(2);
    expect(auth.getSnapshot().status).toBe('guest');
    expect(eventTypes()).toEqual(['logout']);
  });
});

describe('хранилище между запусками', () => {
  function createPersistence(initial: PersistedSession<string, TestUser> | null = null) {
    const log: string[] = [];
    let record = initial;
    const persistence: AuthPersistence<string, TestUser> = {
      load: () => record,
      save: (session) => {
        log.push(`save:${session.credentials}`);
        record = session;
      },
      clear: () => {
        log.push('clear');
        record = null;
      },
    };
    return { persistence, log, read: () => record };
  }

  it('стратегия получает сохранённую запись', async () => {
    const stored = { credentials: 'stored', user: makeUser(), expiresAt: null };
    const { persistence } = createPersistence(stored);
    const { auth, strategy } = createAuth({ config: { persistence } });
    await auth.bootstrap();
    expect(strategy.restore).toHaveBeenCalledWith(expect.objectContaining({ stored }));
  });

  it('вход и обновление профиля сохраняются одной записью', async () => {
    const { persistence, read } = createPersistence();
    const { auth } = createAuth({ config: { persistence } });
    await auth.bootstrap();
    await auth.login({});
    auth.patchUser({ name: 'Анна' });
    await flush();
    expect(read()).toMatchObject({ credentials: 'login-token', user: { name: 'Анна' } });
  });

  it('выход стирает запись', async () => {
    const { persistence, read } = createPersistence();
    const { auth } = createAuth({ config: { persistence } });
    await auth.login({});
    await auth.logout();
    expect(read()).toBeNull();
  });

  it('медленная запись не перетирает последующий выход', async () => {
    const gate = deferred();
    const log: string[] = [];
    const persistence: AuthPersistence<string, TestUser> = {
      load: () => null,
      save: async () => {
        await gate.promise;
        log.push('save');
      },
      clear: () => void log.push('clear'),
    };
    const { auth } = createAuth({ config: { persistence } });
    await auth.bootstrap();
    void auth.login({});
    await flush();
    const logout = auth.logout();
    await flush();
    gate.resolve();
    await logout;
    expect(log.at(-1)).toBe('clear');
  });

  it('повреждённая запись стирается, старт продолжается', async () => {
    const clear = vi.fn();
    const persistence: AuthPersistence<string, TestUser> = {
      load: () => {
        throw new SyntaxError('bad json');
      },
      save: vi.fn(),
      clear,
    };
    const { auth } = createAuth({ config: { persistence } });
    await expect(auth.bootstrap()).resolves.toMatchObject({ status: 'guest' });
    expect(clear).toHaveBeenCalled();
  });
});

describe('destroy', () => {
  it('во время старта: ни записей, ни событий', async () => {
    const gate = deferred<TestGrant | null>();
    const save = vi.fn();
    const { auth, eventTypes } = createAuth({
      strategy: { restore: vi.fn(() => gate.promise) },
      config: { persistence: { load: () => null, save, clear: vi.fn() } },
    });
    const boot = auth.bootstrap();
    auth.destroy();
    gate.resolve(makeGrant('late'));
    await boot;
    await flush();
    expect(save).not.toHaveBeenCalled();
    expect(eventTypes()).toEqual([]);
    expect(auth.getSnapshot().status).toBe('unknown');
  });

  it('после него запросы и вход отвергаются', async () => {
    const { auth } = await createSignedIn();
    auth.destroy();
    await expect(auth.prepare(TARGET)).rejects.toMatchObject({ code: 'destroyed' });
    await expect(auth.login({})).rejects.toMatchObject({ code: 'destroyed' });
  });

  it('не закрывает сессию на сервере', async () => {
    const { auth, strategy } = await createSignedIn();
    auth.destroy();
    await flush();
    expect(strategy.logout).not.toHaveBeenCalled();
  });

  it('повторный вызов безопасен и снимает слушателей', async () => {
    const browser = new TestBrowser();
    const a = await createSignedIn({ browser });
    a.auth.destroy();
    a.auth.destroy();
    expect(browser.channels.get('test:tabs')?.size).toBe(0);
  });
});
