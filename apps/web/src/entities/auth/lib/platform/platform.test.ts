// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deferred, flush } from '../testing/test-kit';
import {
  type BrowserScope,
  createBrowserPlatform,
  detectPlatform,
} from './browser-platform';
import { LocalLocks } from './local-locks';
import { createMemoryPlatform } from './memory-platform';

function createEventTarget() {
  const listeners = new Map<string, Set<(event: Event) => void>>();
  return {
    addEventListener: (type: string, listener: (event: Event) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(listener);
    },
    removeEventListener: (type: string, listener: (event: Event) => void) => {
      listeners.get(type)?.delete(listener);
    },
    dispatch: (type: string, event: object = {}) => {
      for (const listener of [...(listeners.get(type) ?? [])])
        listener(event as Event);
    },
    count: (type: string) => listeners.get(type)?.size ?? 0,
  };
}

function createScope(overrides: Partial<BrowserScope> = {}) {
  const windowTarget = createEventTarget();
  const documentTarget = createEventTarget();
  const document = { ...documentTarget, visibilityState: 'visible' };
  const storage = new Map<string, string>();
  const scope = {
    addEventListener: windowTarget.addEventListener,
    removeEventListener: windowTarget.removeEventListener,
    location: { origin: 'https://app.test', assign: vi.fn() },
    document,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    },
    ...overrides,
  };
  return {
    scope: scope as unknown as BrowserScope,
    windowTarget,
    documentTarget,
    document,
    storage,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('браузерная платформа', () => {
  it('отдаёт origin и видимость', () => {
    const { scope, document } = createScope();
    const platform = createBrowserPlatform(scope);
    expect(platform.origin()).toBe('https://app.test');
    expect(platform.isVisible()).toBe(true);
    document.visibilityState = 'hidden';
    expect(platform.isVisible()).toBe(false);
  });

  it('уводит браузер через location.assign', () => {
    const { scope } = createScope();
    createBrowserPlatform(scope).navigate('/sso');
    expect(scope.location.assign).toHaveBeenCalledWith('/sso');
  });

  describe('блокировка', () => {
    function fakeLocks(request: LockManager['request']) {
      return { navigator: { locks: { request } as unknown as LockManager } };
    }

    it('использует Web Locks, если они есть', async () => {
      const request = vi.fn(
        async (_name: string, _options: unknown, task: () => unknown) => task(),
      );
      const { scope } = createScope(
        fakeLocks(request as unknown as LockManager['request']),
      );
      const result = await createBrowserPlatform(scope).withLock(
        'x',
        async () => 'done',
        {
          timeoutMs: 1_000,
        },
      );
      expect(result).toBe('done');
      expect(request).toHaveBeenCalledWith(
        'x',
        expect.anything(),
        expect.any(Function),
      );
    });

    it('отклоняет ожидание занятой блокировки, не запуская задачу', async () => {
      vi.useFakeTimers();
      const request = (_name: string, options: { signal: AbortSignal }) =>
        new Promise((_, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        });
      const { scope } = createScope(
        fakeLocks(request as unknown as LockManager['request']),
      );
      const task = vi.fn(async () => 'without-lock');

      const result = createBrowserPlatform(scope)
        .withLock('x', task, { timeoutMs: 1_000 })
        .catch((error: unknown) => error);
      await vi.advanceTimersByTimeAsync(1_000);

      expect(await result).toMatchObject({ code: 'timeout' });
      expect(task).not.toHaveBeenCalled();
    });

    it('запрет блокировки (sandbox-iframe) не ломает операцию', async () => {
      const request = () =>
        Promise.reject(new DOMException('Denied', 'SecurityError'));
      const { scope } = createScope(
        fakeLocks(request as unknown as LockManager['request']),
      );
      await expect(
        createBrowserPlatform(scope).withLock('x', async () => 'ok', {
          timeoutMs: 1_000,
        }),
      ).resolves.toBe('ok');
    });

    it('ошибка самой задачи не приводит к повторному запуску', async () => {
      const request = vi.fn(
        async (_name: string, _options: unknown, task: () => unknown) => task(),
      );
      const { scope } = createScope(
        fakeLocks(request as unknown as LockManager['request']),
      );
      const task = vi.fn(async () => {
        throw new DOMException('Aborted', 'AbortError');
      });
      await expect(
        createBrowserPlatform(scope).withLock('x', task, { timeoutMs: 1_000 }),
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(task).toHaveBeenCalledTimes(1);
    });

    it('без Web Locks работает очередь внутри вкладки', async () => {
      const { scope } = createScope();
      const platform = createBrowserPlatform(scope);
      const order: string[] = [];
      const gate = deferred();
      const first = platform.withLock(
        'x',
        async () => {
          order.push('first');
          await gate.promise;
        },
        { timeoutMs: 1_000 },
      );
      const second = platform.withLock(
        'x',
        async () => void order.push('second'),
        {
          timeoutMs: 1_000,
        },
      );
      await flush();
      expect(order).toEqual(['first']);
      gate.resolve();
      await Promise.all([first, second]);
      expect(order).toEqual(['first', 'second']);
    });
  });

  describe('флаги', () => {
    it('сохраняет намерение выхода, когда чтение разрешено, а запись превысила квоту', () => {
      const { scope } = createScope({
        localStorage: {
          getItem: () => null,
          setItem: () => {
            throw new DOMException('Full', 'QuotaExceededError');
          },
          removeItem: () => undefined,
        },
      });
      const { markers } = createBrowserPlatform(scope);
      markers.set('pending');
      expect(markers.has('pending')).toBe(true);
      markers.delete('pending');
      expect(markers.has('pending')).toBe(false);
    });
    it('живут в localStorage', () => {
      const { scope, storage } = createScope();
      const { markers } = createBrowserPlatform(scope);
      markers.set('k');
      expect(storage.get('k')).toBe('1');
      expect(markers.has('k')).toBe(true);
      markers.delete('k');
      expect(storage.has('k')).toBe(false);
    });

    it('заблокированное хранилище не ломает работу', () => {
      const blocked = () => {
        throw new DOMException('Denied', 'SecurityError');
      };
      const { scope } = createScope({
        localStorage: {
          getItem: blocked,
          setItem: blocked,
          removeItem: blocked,
        },
      });
      const { markers } = createBrowserPlatform(scope);
      markers.set('k');
      expect(markers.has('k')).toBe(true);
      markers.delete('k');
      expect(markers.has('k')).toBe(false);
    });
  });

  describe('канал вкладок', () => {
    it('недоступный по политике BroadcastChannel не срывает запуск', () => {
      const { scope } = createScope({
        BroadcastChannel: class {
          constructor() {
            throw new DOMException('Denied', 'SecurityError');
          }
        } as unknown as typeof BroadcastChannel,
      });
      expect(createBrowserPlatform(scope).openChannel('x')).toBeNull();
    });
    it('нет BroadcastChannel: null', () => {
      const { scope } = createScope();
      expect(createBrowserPlatform(scope).openChannel('c')).toBeNull();
    });

    it('доставляет сообщения между экземплярами', async () => {
      const { scope } = createScope({ BroadcastChannel });
      const platform = createBrowserPlatform(scope);
      const a = platform.openChannel('unit-channel');
      const b = platform.openChannel('unit-channel');
      const received = deferred<unknown>();
      b?.subscribe((message) => received.resolve(message));

      a?.post({ type: 'logout' });

      await expect(received.promise).resolves.toEqual({ type: 'logout' });
      a?.close();
      b?.close();
    });
  });

  describe('возвращение на страницу', () => {
    it('сообщает о показе вкладки', () => {
      const { scope, documentTarget, document } = createScope();
      const listener = vi.fn();
      createBrowserPlatform(scope).onResume(listener);

      document.visibilityState = 'hidden';
      documentTarget.dispatch('visibilitychange');
      expect(listener).not.toHaveBeenCalled();

      document.visibilityState = 'visible';
      documentTarget.dispatch('visibilitychange');
      expect(listener).toHaveBeenCalledWith({ restoredFromCache: false });
    });

    it('различает возврат из bfcache', () => {
      const { scope, windowTarget } = createScope();
      const listener = vi.fn();
      createBrowserPlatform(scope).onResume(listener);

      windowTarget.dispatch('pageshow', { persisted: false });
      expect(listener).not.toHaveBeenCalled();

      windowTarget.dispatch('pageshow', { persisted: true });
      expect(listener).toHaveBeenCalledWith({ restoredFromCache: true });
    });

    it('отписка снимает слушателей', () => {
      const { scope, windowTarget, documentTarget } = createScope();
      const platform = createBrowserPlatform(scope);
      platform.onResume(vi.fn())();
      platform.onOnline(vi.fn())();
      expect(windowTarget.count('pageshow')).toBe(0);
      expect(windowTarget.count('online')).toBe(0);
      expect(documentTarget.count('visibilitychange')).toBe(0);
    });
  });
});

describe('LocalLocks', () => {
  it('выполняет задачи по очереди', async () => {
    const locks = new LocalLocks();
    const order: number[] = [];
    await Promise.all(
      [1, 2, 3].map((value) =>
        locks.run(
          'x',
          async () => {
            await flush(3);
            order.push(value);
          },
          1_000,
        ),
      ),
    );
    expect(order).toEqual([1, 2, 3]);
  });

  it('упавшая задача не ломает очередь', async () => {
    const locks = new LocalLocks();
    await expect(
      locks.run(
        'x',
        async () => {
          throw new Error('boom');
        },
        1_000,
      ),
    ).rejects.toThrow('boom');
    await expect(locks.run('x', async () => 'next', 1_000)).resolves.toBe(
      'next',
    );
  });

  it('таймаут ожидающего не выпускает следующего раньше владельца', async () => {
    vi.useFakeTimers();
    const locks = new LocalLocks();
    const gate = deferred();
    const owner = locks.run('x', () => gate.promise, 500);
    const skipped = vi.fn(async () => 'skipped');
    const next = locks.run('x', skipped, 500).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(500);
    expect(await next).toMatchObject({ code: 'timeout' });
    const last = vi.fn(async () => 'last');
    const waiting = locks.run('x', last, 1_000);
    await flush();
    expect(last).not.toHaveBeenCalled();
    gate.resolve();
    await owner;
    await expect(waiting).resolves.toBe('last');
    expect(skipped).not.toHaveBeenCalled();
  });

  it('разные имена не мешают друг другу', async () => {
    const locks = new LocalLocks();
    void locks.run('a', () => new Promise(() => undefined), 60_000);
    await expect(locks.run('b', async () => 'free', 60_000)).resolves.toBe(
      'free',
    );
  });
});

describe('окружение без браузера', () => {
  it('detectPlatform выбирает платформу без браузера', () => {
    expect(detectPlatform().origin()).toBeNull();
  });

  it('редирект недоступен', () => {
    expect(() => createMemoryPlatform().navigate('/x')).toThrow();
  });

  it('канала нет, подписки ничего не делают', () => {
    const platform = createMemoryPlatform({ origin: 'https://ssr.test' });
    expect(platform.origin()).toBe('https://ssr.test');
    expect(platform.openChannel('x')).toBeNull();
    expect(() => platform.onResume(vi.fn())()).not.toThrow();
    expect(() => platform.onOnline(vi.fn())()).not.toThrow();
  });

  it('флаги работают в памяти', () => {
    const { markers } = createMemoryPlatform();
    markers.set('k');
    expect(markers.has('k')).toBe(true);
    markers.delete('k');
    expect(markers.has('k')).toBe(false);
  });
});
