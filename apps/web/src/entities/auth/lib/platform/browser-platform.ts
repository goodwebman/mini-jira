import { AuthError } from '../errors';
import { LocalLocks } from './local-locks';
import { createMemoryPlatform } from './memory-platform';
import type {
  AuthChannel,
  AuthMarkers,
  AuthPlatform,
  AuthResumeInfo,
} from './types';

interface ScopeEventTarget {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

export interface BrowserScope extends ScopeEventTarget {
  readonly location: { readonly origin: string; assign(url: string): void };
  readonly document: ScopeEventTarget & { readonly visibilityState: string };
  readonly navigator?: { readonly locks?: LockManager };
  readonly localStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  readonly BroadcastChannel?: typeof BroadcastChannel;
}

function isBrowserScope(scope: unknown): scope is BrowserScope {
  const candidate = scope as Partial<BrowserScope>;
  return (
    typeof candidate.document === 'object' &&
    typeof candidate.location === 'object'
  );
}

async function withWebLock<T>(
  locks: LockManager,
  name: string,
  task: () => Promise<T>,
  timeoutMs: number,
  fallback: () => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let acquired = false;
  try {
    return (await locks.request(name, { signal: controller.signal }, () => {
      acquired = true;
      clearTimeout(timer);
      return task();
    })) as T;
  } catch (error) {
    // A busy lock must never be bypassed; unavailable APIs fall back to the local queue.
    if (!acquired && controller.signal.aborted) throw new AuthError('timeout');
    if (
      !acquired &&
      error instanceof DOMException &&
      (error.name === 'SecurityError' || error.name === 'NotSupportedError')
    )
      return fallback();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function openBroadcastChannel(
  scope: BrowserScope,
  name: string,
): AuthChannel | null {
  if (!scope.BroadcastChannel) return null;
  let channel: BroadcastChannel;
  try {
    channel = new scope.BroadcastChannel(name);
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'SecurityError' || error.name === 'NotSupportedError')
    )
      return null;
    throw error;
  }
  return {
    post: (message) => channel.postMessage(message),
    subscribe: (listener) => {
      const handler = (event: MessageEvent) => listener(event.data);
      channel.addEventListener('message', handler);
      return () => channel.removeEventListener('message', handler);
    },
    close: () => channel.close(),
  };
}

// Доступ к localStorage бросает исключение при заблокированном хранилище. Без него флаг
// просто доживает до конца вкладки.
function createMarkers(scope: BrowserScope): AuthMarkers {
  const fallback = new Set<string>();
  const attempt = <T>(
    action: (storage: NonNullable<BrowserScope['localStorage']>) => T,
  ) => {
    try {
      return scope.localStorage ? { value: action(scope.localStorage) } : null;
    } catch {
      return null;
    }
  };
  return {
    has: (key) =>
      fallback.has(key) ||
      (attempt((storage) => storage.getItem(key) !== null)?.value ?? false),
    set: (key) => {
      if (!attempt((storage) => storage.setItem(key, '1'))) fallback.add(key);
    },
    delete: (key) => {
      attempt((storage) => storage.removeItem(key));
      fallback.delete(key);
    },
  };
}

export function createBrowserPlatform(scope: BrowserScope): AuthPlatform {
  const localLocks = new LocalLocks();

  return {
    now: () => Date.now(),
    origin: () => scope.location.origin,
    isVisible: () => scope.document.visibilityState !== 'hidden',
    withLock: (name, task, { timeoutMs }) => {
      const webLocks = scope.navigator?.locks;
      return webLocks
        ? withWebLock(webLocks, name, task, timeoutMs, () =>
            localLocks.run(name, task, timeoutMs),
          )
        : localLocks.run(name, task, timeoutMs);
    },
    openChannel: (name) => openBroadcastChannel(scope, name),
    onResume: (listener: (info: AuthResumeInfo) => void) => {
      const onVisibility = () => {
        if (scope.document.visibilityState === 'visible')
          listener({ restoredFromCache: false });
      };
      const onPageShow = (event: Event) => {
        if ((event as PageTransitionEvent).persisted)
          listener({ restoredFromCache: true });
      };
      scope.document.addEventListener('visibilitychange', onVisibility);
      scope.addEventListener('pageshow', onPageShow);
      return () => {
        scope.document.removeEventListener('visibilitychange', onVisibility);
        scope.removeEventListener('pageshow', onPageShow);
      };
    },
    onOnline: (listener) => {
      scope.addEventListener('online', listener);
      return () => scope.removeEventListener('online', listener);
    },
    navigate: (url) => scope.location.assign(url),
    markers: createMarkers(scope),
  };
}

/** Браузер, если он есть. Иначе окружение без него: импорт модуля безопасен на сервере. */
export function detectPlatform(): AuthPlatform {
  return isBrowserScope(globalThis)
    ? createBrowserPlatform(globalThis)
    : createMemoryPlatform();
}
