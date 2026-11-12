import { vi } from 'vitest';

import { AuthService, type AuthServiceConfig } from '../auth-service';
import { LocalLocks } from '../platform/local-locks';
import type {
  AuthChannel,
  AuthPlatform,
  AuthResumeInfo,
} from '../platform/types';
import type {
  AuthAttempt,
  AuthEvent,
  AuthGrant,
  AuthStrategy,
  AuthTarget,
} from '../types';

export interface TestUser {
  readonly id: string;
  readonly name: string;
}

export type TestGrant = AuthGrant<string, TestUser>;
export type TestStrategy = AuthStrategy<string, TestUser, unknown>;

export const SELF_ORIGIN = 'https://app.test';
export const TARGET: AuthTarget = {
  url: `${SELF_ORIGIN}/api/tasks`,
  method: 'GET',
};

export const makeUser = (id = 'anna', name = id): TestUser => ({ id, name });

export const makeGrant = (
  token: string,
  user: null | TestUser = makeUser(),
  expiresInMs?: null | number,
): TestGrant => ({ credentials: token, user, expiresInMs });

export function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

/** Прогоняет очередь микрозадач: без таймеров и настоящего ожидания. */
export async function flush(rounds = 30): Promise<void> {
  for (let round = 0; round < rounds; round += 1) await Promise.resolve();
}

export interface TestPlatform extends AuthPlatform {
  resume(info?: AuthResumeInfo): void;
  goOnline(): void;
  visible: boolean;
  readonly navigated: string[];
}

/** Один браузер: общие блокировка, флаги и канал на все вкладки. */
export class TestBrowser {
  readonly locks = new LocalLocks();
  readonly markers = new Set<string>();
  readonly channels = new Map<string, Set<(message: unknown) => void>>();
  now = 1_000_000;

  advance(ms: number): void {
    this.now += ms;
  }

  openChannel(name: string): AuthChannel {
    const subscribers = this.channels.get(name) ?? new Set();
    this.channels.set(name, subscribers);
    let own: ((message: unknown) => void) | null = null;
    return {
      post: (message) => {
        for (const subscriber of [...subscribers]) {
          if (subscriber !== own) queueMicrotask(() => subscriber(message));
        }
      },
      subscribe: (listener) => {
        own = listener;
        subscribers.add(listener);
        return () => subscribers.delete(listener);
      },
      close: () => {
        if (own) subscribers.delete(own);
      },
    };
  }

  platform(): TestPlatform {
    const resumeListeners = new Set<(info: AuthResumeInfo) => void>();
    const onlineListeners = new Set<() => void>();
    const navigated: string[] = [];
    const platform: TestPlatform = {
      visible: true,
      navigated,
      now: () => this.now,
      origin: () => SELF_ORIGIN,
      isVisible: () => platform.visible,
      withLock: (name, task, { timeoutMs }) =>
        this.locks.run(name, task, timeoutMs),
      openChannel: (name) => this.openChannel(name),
      onResume: (listener) => {
        resumeListeners.add(listener);
        return () => resumeListeners.delete(listener);
      },
      onOnline: (listener) => {
        onlineListeners.add(listener);
        return () => onlineListeners.delete(listener);
      },
      navigate: (url) => void navigated.push(url),
      markers: {
        has: (key) => this.markers.has(key),
        set: (key) => void this.markers.add(key),
        delete: (key) => void this.markers.delete(key),
      },
      resume: (info = { restoredFromCache: false }) => {
        for (const listener of [...resumeListeners]) listener(info);
      },
      goOnline: () => {
        for (const listener of [...onlineListeners]) listener();
      },
    };
    return platform;
  }
}

export function createStrategy(overrides: Partial<TestStrategy> = {}) {
  return {
    name: 'test',
    restore: vi.fn<TestStrategy['restore']>(async () => null),
    login: vi.fn<TestStrategy['login']>(async () => makeGrant('login-token')),
    renew: vi.fn<NonNullable<TestStrategy['renew']>>(async () =>
      makeGrant('renewed-token'),
    ),
    logout: vi.fn<NonNullable<TestStrategy['logout']>>(async () => {}),
    decorate: vi.fn<TestStrategy['decorate']>((token) => ({
      headers: { Authorization: `Bearer ${token}` },
    })),
    ...overrides,
  };
}

type TestConfig = Partial<AuthServiceConfig<TestUser, unknown, string>>;

export function createAuth(
  options: {
    browser?: TestBrowser;
    strategy?: Partial<TestStrategy>;
    /** Настоящая стратегия: у классов методы на прототипе, spread их потерял бы. */
    instance?: object;
    config?: TestConfig;
  } = {},
) {
  const browser = options.browser ?? new TestBrowser();
  const platform = browser.platform();
  const strategy = createStrategy(options.strategy);
  const auth = new AuthService<TestUser, unknown, string>({
    strategy: (options.instance as TestStrategy | undefined) ?? strategy,
    platform,
    identify: (user) => user.id,
    namespace: 'test',
    ...options.config,
  });
  const events: AuthEvent<TestUser>[] = [];
  auth.on((event) => events.push(event));
  const eventTypes = () => events.map((event) => event.type);
  return { auth, strategy, browser, platform, events, eventTypes };
}

/** Сессия уже поднята на токене `token`. */
export async function createSignedIn(
  options: Parameters<typeof createAuth>[0] & {
    token?: string;
    ttlMs?: null | number;
  } = {},
) {
  const token = options.token ?? 'first-token';
  const context = createAuth({
    ...options,
    strategy: {
      restore: vi.fn(async () => makeGrant(token, makeUser(), options.ttlMs)),
      ...options.strategy,
    },
  });
  await context.auth.bootstrap();
  context.events.length = 0;
  return context;
}

const authorizationOf = (attempt: AuthAttempt) =>
  attempt.headers.Authorization ?? null;

/** Сервер: принимает только перечисленные токены и записывает, что пришло. */
export function createServer(...acceptedTokens: string[]) {
  const accepted = new Set(acceptedTokens.map((token) => `Bearer ${token}`));
  const received: (null | string)[] = [];
  const send = vi.fn(async (attempt: AuthAttempt) => {
    const authorization = authorizationOf(attempt);
    received.push(authorization);
    return {
      status: authorization !== null && accepted.has(authorization) ? 200 : 401,
    };
  });
  return { send, received };
}
