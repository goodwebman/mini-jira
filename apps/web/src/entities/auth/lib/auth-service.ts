import { createAuthFetch, type AuthFetch } from './adapters/fetch';
import { AuthStore } from './auth-store';
import { AuthError, toAuthError } from './errors';
import { abortable, Backoff, SerialQueue, throwIfAborted, withDeadline } from './internal/async';
import { OriginPolicy } from './origin-policy';
import { detectPlatform } from './platform/browser-platform';
import type { AuthChannel, AuthPlatform, AuthResumeInfo } from './platform/types';
import { describeResponse, describeThrown } from './response-info';
import { parseTabMessage, type TabMessage } from './tab-messages';
import type {
  AuthAttempt,
  AuthEvent,
  AuthEventSource,
  AuthGrant,
  AuthKickReason,
  AuthOrigin,
  AuthPersistence,
  AuthPipeline,
  AuthRedirect,
  AuthResponseInfo,
  AuthSettlement,
  AuthState,
  AuthStrategy,
  AuthTarget,
  AuthVerdict,
  ExecuteOptions,
  FetchUserContext,
  PersistedSession,
  PrepareOptions,
  SettleOptions,
  Unsubscribe,
} from './types';

const OPERATION_TIMEOUT_MS = 15_000;
const LOGOUT_TIMEOUT_MS = 5_000;
// Дольше операции: вкладка под блокировкой успевает закончить, прежде чем другие пойдут без неё.
const LOCK_GRACE_MS = 5_000;
const RENEW_LEEWAY_MS = 30_000;
const POLL_INTERVAL_MS = 180_000;
const REVALIDATE_AFTER_MS = 60_000;
// Сервер с нулевым TTL не должен превратить каждый запрос в refresh.
const MIN_RENEW_DELAY_MS = 1_000;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

export interface AuthServiceConfig<TUser, TLoginInput, TCredentials> {
  readonly strategy: AuthStrategy<TCredentials, TUser, TLoginInput>;
  /** Префикс имён блокировки, канала вкладок и флагов. */
  readonly namespace?: string;
  /** Чужие origin, которым можно отправлять реквизиты. Свой разрешён всегда. */
  readonly trustedOrigins?: readonly string[];
  /** Куда ещё можно уводить браузер при входе: страница провайдера SSO. */
  readonly redirectOrigins?: readonly string[];
  /** Разрешить `http://` не на localhost. Только для стендов во внутренней сети. */
  readonly allowInsecureOrigins?: boolean;
  /** База для относительных URL там, где нет `location`: SSR, Node. */
  readonly baseUrl?: string;
  /** Постоянный идентификатор пользователя: по нему видно смену аккаунта. */
  readonly identify?: (user: TUser) => string;
  readonly fetchUser?: (context: FetchUserContext) => Promise<TUser>;
  /** Вернуть причину, если с такими данными сессию нужно закрыть, например удалённый аккаунт. */
  readonly assessUser?: (user: TUser) => AuthKickReason | null;
  readonly persistence?: AuthPersistence<TCredentials, TUser>;
  readonly platform?: AuthPlatform;
  readonly operationTimeoutMs?: number;
  readonly logoutTimeoutMs?: number;
  /** За сколько до истечения обновлять токен. */
  readonly renewLeewayMs?: number;
  readonly pollIntervalMs?: number;
  /** Как давно должен был обновляться профиль, чтобы перезапросить его при возврате на вкладку. */
  readonly revalidateAfterMs?: number;
  readonly onListenerError?: (error: unknown) => void;
}

type RenewalOutcome = { readonly ok: true } | { readonly ok: false; readonly error: AuthError };

type SessionEnd =
  | { readonly type: 'logout'; readonly origin: AuthOrigin }
  | {
      readonly type: 'kick';
      readonly origin: AuthOrigin;
      readonly reason: AuthKickReason;
      readonly error: AuthError | null;
    };

const isRedirect = (value: object): value is AuthRedirect => 'redirectTo' in value;
const sessionChanged = () => new AuthError('session_changed');
const destroyed = () => new AuthError('destroyed');
const reportToConsole = (error: unknown) => console.error('[auth]', error);

interface Dispatched<TResult> {
  readonly info: AuthResponseInfo;
  readonly unwrap: () => TResult;
  readonly discard: () => void;
}

/** Ответ без статуса (свой клиент не сообщил его): считаем, что авторизация ни при чём. */
const UNKNOWN_RESPONSE: AuthResponseInfo = {
  status: 200,
  header: () => null,
  json: async () => null,
};

const PASS: AuthVerdict = { action: 'pass' };
const RENEW: AuthVerdict = { action: 'renew' };
const REJECT: AuthVerdict = { action: 'reject' };

/**
 * Жизненный цикл сессии и конвейер авторизованных запросов. Не зависит ни от
 * фреймворка, ни от варианта авторизации: тот приходит через `AuthStrategy`.
 *
 * Все гонки держатся на двух счётчиках:
 * - `epoch` растёт на границе сессии (вход, выход, смена пользователя). Результат
 *   операции, начатой в старой эпохе, выбрасывается;
 * - `version` растёт при каждой смене реквизитов. По ней видно, что 401 пришёл
 *   на уже заменённый токен и сессия тут ни при чём.
 *
 * Операции, меняющие cookie (восстановление, вход, refresh, выход), идут строго
 * по одной во всех вкладках. Иначе ротация refresh-токена ломается о параллельный
 * запрос, а `Set-Cookie` старого ответа затирает cookie нового пользователя.
 */
export class AuthService<TUser, TLoginInput = unknown, TCredentials = unknown>
  implements AuthPipeline, AuthEventSource<TUser>
{
  readonly #config: AuthServiceConfig<TUser, TLoginInput, TCredentials>;
  readonly #strategy: AuthStrategy<TCredentials, TUser, TLoginInput>;
  readonly #platform: AuthPlatform;
  readonly #policy: OriginPolicy;
  readonly #store: AuthStore<TUser>;
  readonly #storage: SerialQueue;
  readonly #renewBackoff = new Backoff(BACKOFF_BASE_MS, BACKOFF_MAX_MS);
  readonly #bootstrapBackoff = new Backoff(BACKOFF_BASE_MS, BACKOFF_MAX_MS);
  readonly #operationTimeoutMs: number;
  readonly #logoutTimeoutMs: number;
  readonly #renewLeewayMs: number;
  readonly #lockName: string;
  readonly #channelName: string;
  readonly #pendingLogoutKey: string;
  readonly #disposers: Unsubscribe[] = [];

  // Приватное поле: секрет не попадёт ни в снимок состояния, ни в JSON.stringify сервиса.
  #credentials: TCredentials | null = null;
  #expiresAt: number | null = null;
  #renewAt: number | null = null;

  #epoch = 0;
  #version = 0;
  #signOuts = 0;

  #isDestroyed = false;
  #isConnected = false;
  #isReadyAnnounced = false;
  #isBootstrapAttempted = false;

  #channel: AuthChannel | null = null;
  #bootstrapRun: Promise<AuthState<TUser>> | null = null;
  #loginRun: Promise<AuthState<TUser>> | null = null;
  #logoutRun: Promise<AuthState<TUser>> | null = null;
  #renewal: Promise<RenewalOutcome> | null = null;
  #resyncRun: Promise<void> | null = null;
  #userRefresh: Promise<AuthState<TUser>> | null = null;

  #renewBlockedUntil = 0;
  #renewFailure: AuthError | null = null;
  #userCheckedAt = 0;
  #bootstrapRetry: ReturnType<typeof setTimeout> | null = null;
  #pollTimer: ReturnType<typeof setInterval> | null = null;

  /** Готовый авторизованный `fetch`. Подходит всем библиотекам, принимающим свой fetch. */
  readonly fetch: AuthFetch = createAuthFetch(this);

  constructor(config: AuthServiceConfig<TUser, TLoginInput, TCredentials>) {
    const namespace = config.namespace ?? 'auth';
    this.#config = config;
    this.#strategy = config.strategy;
    this.#platform = config.platform ?? detectPlatform();
    this.#operationTimeoutMs = config.operationTimeoutMs ?? OPERATION_TIMEOUT_MS;
    this.#logoutTimeoutMs = config.logoutTimeoutMs ?? LOGOUT_TIMEOUT_MS;
    this.#renewLeewayMs = config.renewLeewayMs ?? RENEW_LEEWAY_MS;
    this.#lockName = `${namespace}:session`;
    this.#channelName = `${namespace}:tabs`;
    this.#pendingLogoutKey = `${namespace}:pending-logout`;

    const reportError = config.onListenerError ?? reportToConsole;
    this.#store = new AuthStore(reportError);
    this.#storage = new SerialQueue(reportError);
    this.#policy = new OriginPolicy({
      trustedOrigins: config.trustedOrigins,
      redirectOrigins: config.redirectOrigins,
      allowInsecureOrigins: config.allowInsecureOrigins,
      baseUrl: config.baseUrl,
      selfOrigin: () => this.#platform.origin(),
    });
  }

  // ---------------------------------------------------------------------------
  // Состояние
  // ---------------------------------------------------------------------------

  /** Стабильный снимок: объект меняется только вместе с состоянием. */
  getSnapshot = (): AuthState<TUser> => this.#store.state;

  /** Подписка на снимок. Форма подходит для `useSyncExternalStore`. */
  subscribe = (listener: () => void): Unsubscribe => this.#store.subscribe(listener);

  /** Подписка на события: вход, выход, kick. */
  on = (listener: (event: AuthEvent<TUser>) => void): Unsubscribe => this.#store.on(listener);

  // ---------------------------------------------------------------------------
  // Жизненный цикл
  // ---------------------------------------------------------------------------

  /**
   * Холодный старт. После успеха повторный вызов ничего не делает. Если сеть подвела,
   * статус остаётся `unknown` и в `error` лежит причина: это не то же самое, что гость.
   */
  bootstrap = (): Promise<AuthState<TUser>> => {
    if (this.#isDestroyed) return Promise.resolve(this.getSnapshot());
    if (this.#bootstrapRun !== null) return this.#bootstrapRun;
    if (this.getSnapshot().status !== 'unknown') return Promise.resolve(this.getSnapshot());

    this.#connect();
    this.#isBootstrapAttempted = true;
    this.#cancelBootstrapRetry();
    const run = this.#runBootstrap().finally(() => {
      this.#bootstrapRun = null;
    });
    this.#bootstrapRun = run;
    return run;
  };

  /** Вход. Пока он выполняется, повторные вызовы получают тот же промис. */
  login = (input: TLoginInput): Promise<AuthState<TUser>> => {
    if (this.#isDestroyed) return Promise.reject(destroyed());
    if (this.#loginRun !== null) return this.#loginRun;
    const run = this.#runLogin(input).finally(() => {
      this.#loginRun = null;
    });
    this.#loginRun = run;
    return run;
  };

  /** Открыть сессию по реквизитам из внешнего сценария: SMS, QR, второй фактор. */
  establish = async (grant: AuthGrant<TCredentials, TUser>): Promise<AuthState<TUser>> => {
    if (this.#isDestroyed) throw destroyed();
    this.#connect();
    this.#cancelBootstrapRetry();
    this.#platform.markers.delete(this.#pendingLogoutKey);
    this.#openSession(grant, { origin: 'local', announce: true });
    this.#postToTabs({ type: 'login', identity: this.#currentIdentity() });
    await this.#storage.idle();
    return this.getSnapshot();
  };

  /**
   * Выход. Локально сессия закрывается сразу, а не после ответа сервера: зависший
   * запрос не должен держать пользователя внутри.
   */
  logout = (): Promise<AuthState<TUser>> => {
    if (this.#isDestroyed) return Promise.resolve(this.getSnapshot());
    if (this.#logoutRun !== null) return this.#logoutRun;
    const run = this.#runLogout().finally(() => {
      this.#logoutRun = null;
    });
    this.#logoutRun = run;
    return run;
  };

  /** Закрыть сессию вручную: например, WebSocket сообщил, что её отозвали. */
  kick = (reason: AuthKickReason = 'unauthorized'): void => {
    this.#kick(reason, null);
  };

  /** Обновить данные пользователя. Сеть и 403 оставляют старые данные, 401 разбирает конвейер. */
  refreshUser = (): Promise<AuthState<TUser>> => {
    const { fetchUser } = this.#config;
    if (this.#isDestroyed || !fetchUser || this.getSnapshot().status !== 'authenticated') {
      return Promise.resolve(this.getSnapshot());
    }
    if (this.#userRefresh !== null) return this.#userRefresh;

    const epoch = this.#epoch;
    const load = withDeadline(this.#operationTimeoutMs, (signal) =>
      fetchUser({ fetch: this.fetch, signal }),
    );
    const run: Promise<AuthState<TUser>> = load
      .then(
        (user) => {
          if (epoch !== this.#epoch) return;
          this.#userCheckedAt = this.#platform.now();
          this.#applyUser(user);
        },
        () => undefined,
      )
      .then(() => this.getSnapshot())
      .finally(() => {
        if (this.#userRefresh === run) this.#userRefresh = null;
      });
    this.#userRefresh = run;
    return run;
  };

  /** Обновить профиль после успешной мутации, без запроса. Ключи с `undefined` пропускаются. */
  patchUser = (patch: Partial<TUser>): AuthState<TUser> => {
    const { status, user } = this.getSnapshot();
    if (this.#isDestroyed || status !== 'authenticated' || user === null) return this.getSnapshot();
    const defined = Object.entries(patch).filter(([, value]) => value !== undefined);
    if (defined.length > 0) this.#applyUser({ ...user, ...Object.fromEntries(defined) });
    return this.getSnapshot();
  };

  /** Фоновая проверка сессии. На скрытой вкладке запросы не уходят. */
  startPolling = (): void => {
    if (this.#isDestroyed || this.#pollTimer !== null) return;
    this.#pollTimer = setInterval(() => {
      if (this.#platform.isVisible()) void this.refreshUser();
    }, this.#config.pollIntervalMs ?? POLL_INTERVAL_MS);
  };

  stopPolling = (): void => {
    if (this.#pollTimer !== null) clearInterval(this.#pollTimer);
    this.#pollTimer = null;
  };

  /** Остановить сервис. Сессию это не закрывает, для этого есть `logout`. */
  destroy = (): void => {
    if (this.#isDestroyed) return;
    this.#isDestroyed = true;
    this.#advanceEpoch();
    this.#credentials = null;
    this.stopPolling();
    this.#cancelBootstrapRetry();
    for (const dispose of this.#disposers.splice(0)) dispose();
    this.#store.clear();
  };

  // ---------------------------------------------------------------------------
  // Конвейер запросов: API для адаптеров HTTP-библиотек
  // ---------------------------------------------------------------------------

  resolveUrl = (url: string): string => this.#policy.resolve(url);

  /** Шаг 1: дождаться актуальных реквизитов и получить подпись запроса. */
  prepare = async (target: AuthTarget, options: PrepareOptions = {}): Promise<AuthAttempt> => {
    const { signal, skip = false, retryOf } = options;
    if (this.#isDestroyed) throw destroyed();
    throwIfAborted(signal);
    if (skip || !this.#policy.isTrusted(target.url)) return this.#anonymousAttempt(false);

    await this.#awaitSettledSession(signal);
    if (this.#needsRenewal()) {
      const outcome = await abortable(this.#renew(), signal);
      // Токен ещё действует: refresh упал, а запрос пройдёт. Просроченный смысла слать нет.
      if (!outcome.ok && this.#credentials !== null && this.#isExpired()) throw outcome.error;
    }

    const isRetry = retryOf !== undefined;
    // Повтор чужого запроса от имени нового пользователя хуже, чем ошибка.
    if (retryOf?.authorized && retryOf.epoch !== this.#epoch) throw sessionChanged();
    if (this.#credentials === null) return this.#anonymousAttempt(isRetry);

    const epoch = this.#epoch;
    const version = this.#version;
    const decoration = await this.#strategy.decorate(this.#credentials, target);
    if (epoch !== this.#epoch) throw sessionChanged();

    return {
      headers: decoration.headers ?? {},
      credentialsMode: decoration.credentialsMode,
      ticket: { authorized: true, epoch, version, isRetry },
    };
  };

  /** Шаг 2: разобрать ответ. `retry` значит: вызвать `prepare` с `retryOf` и отправить заново. */
  settle = async (
    attempt: Pick<AuthAttempt, 'ticket'>,
    response: AuthResponseInfo,
    options: SettleOptions = {},
  ): Promise<AuthSettlement> => {
    const { ticket } = attempt;
    if (!ticket.authorized) return 'done';
    if (ticket.epoch !== this.#epoch) {
      // В 401 данных нет. Любой другой ответ относится к закрытой сессии, и показывать его нельзя.
      if (response.status === 401) return 'done';
      throw sessionChanged();
    }
    if (this.#credentials === null) return 'done';

    const verdict = await this.#assess(response, this.#credentials);
    if (ticket.epoch !== this.#epoch) return 'done';
    if (verdict.action === 'pass') return 'done';

    // Запрос ушёл с реквизитами, которые уже заменили: сессия тут ни при чём.
    const isStale = ticket.version !== this.#version;

    if (verdict.action === 'reject') {
      if (!isStale) this.#kick(verdict.reason ?? 'unauthorized', null);
      return 'done';
    }
    if (ticket.isRetry) {
      if (!isStale) this.#kick('unauthorized', null);
      return 'done';
    }
    if (verdict.action === 'retry' || isStale) return 'retry';

    const outcome = await abortable(this.#renew(), options.signal);
    if (outcome.ok) return 'retry';
    if (ticket.epoch !== this.#epoch) return 'done';
    throw outcome.error;
  };

  /** `prepare` + отправка + `settle` с одним повтором. Основа для своего HTTP-клиента. */
  execute = async <TResult>(
    target: AuthTarget,
    send: (attempt: AuthAttempt) => Promise<TResult>,
    options: ExecuteOptions<TResult> = {},
  ): Promise<TResult> => {
    const { signal, skip } = options;
    const first = await this.prepare(target, { signal, skip });
    const firstSent = await this.#dispatch(first, send, options);
    if ((await this.settle(first, firstSent.info, { signal })) === 'done') return firstSent.unwrap();

    firstSent.discard();
    const second = await this.prepare(target, { signal, skip, retryOf: first.ticket });
    const secondSent = await this.#dispatch(second, send, options);
    await this.settle(second, secondSent.info, { signal });
    return secondSent.unwrap();
  };

  async #dispatch<TResult>(
    attempt: AuthAttempt,
    send: (attempt: AuthAttempt) => Promise<TResult>,
    options: ExecuteOptions<TResult>,
  ): Promise<Dispatched<TResult>> {
    const inspect = options.inspect ?? describeResponse;
    const inspectError = options.inspectError ?? describeThrown;
    try {
      const result = await send(attempt);
      return {
        info: (await inspect(result)) ?? UNKNOWN_RESPONSE,
        unwrap: () => result,
        discard: () => options.discard?.(result),
      };
    } catch (error) {
      const info = inspectError(error);
      if (info === null) throw error;
      return {
        info,
        unwrap: () => {
          throw error;
        },
        discard: () => undefined,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Открытие и закрытие сессии
  // ---------------------------------------------------------------------------

  async #runBootstrap(): Promise<AuthState<TUser>> {
    const epoch = this.#epoch;
    this.#store.patch({ phase: 'restoring', error: null });
    try {
      const grant = await this.#exclusive(async () => {
        // Пользователь уже вышел, а сервер не узнал. Поднимать сессию по живой cookie нельзя.
        if (await this.#flushPendingLogout()) return null;
        return withDeadline(this.#operationTimeoutMs, (signal) => this.#restore(signal));
      });
      if (epoch === this.#epoch) this.#finishRestore(grant);
    } catch (cause) {
      if (epoch === this.#epoch) this.#failRestore(toAuthError(cause));
    }
    return this.getSnapshot();
  }

  #finishRestore(grant: AuthGrant<TCredentials, TUser> | null): void {
    this.#bootstrapBackoff.reset();
    if (grant === null) {
      this.#clearSession();
      this.#announceReady();
    } else {
      this.#openSession(grant, { origin: 'local', announce: false });
    }
  }

  #failRestore(error: AuthError): void {
    // 401 и 403 на холодном старте значат «сессии нет». Всё остальное: неизвестно.
    if (error.code === 'unauthorized' || error.code === 'forbidden') {
      this.#finishRestore(null);
      return;
    }
    this.#store.patch({ phase: 'idle', error });
    this.#scheduleBootstrapRetry();
  }

  async #restore(signal: AbortSignal): Promise<AuthGrant<TCredentials, TUser> | null> {
    const stored = await this.#loadPersisted();
    return this.#strategy.restore({ stored, signal });
  }

  async #loadPersisted(): Promise<PersistedSession<TCredentials, TUser> | null> {
    const { persistence } = this.#config;
    if (!persistence) return null;
    try {
      return (await persistence.load()) ?? null;
    } catch {
      this.#storage.add(() => persistence.clear());
      return null;
    }
  }

  async #runLogin(input: TLoginInput): Promise<AuthState<TUser>> {
    this.#connect();
    // Сравниваем выходы, а не эпохи: восстановление сессии не должно отменять вход.
    const signOuts = this.#signOuts;
    this.#store.patch({ phase: 'signing-in', error: null });
    try {
      const result = await this.#exclusive(() =>
        withDeadline(this.#operationTimeoutMs, (signal) => this.#strategy.login(input, { signal })),
      );
      if (isRedirect(result)) return this.#redirect(result);
      if (this.#isDestroyed || signOuts !== this.#signOuts) {
        await this.#revokeOrphan(result);
        throw sessionChanged();
      }
      this.#cancelBootstrapRetry();
      this.#platform.markers.delete(this.#pendingLogoutKey);
      this.#openSession(result, { origin: 'local', announce: true });
      this.#postToTabs({ type: 'login', identity: this.#currentIdentity() });
      await this.#storage.idle();
      return this.getSnapshot();
    } catch (cause) {
      if (this.getSnapshot().phase === 'signing-in') this.#store.patch({ phase: 'idle' });
      throw toAuthError(cause);
    }
  }

  #redirect({ redirectTo }: AuthRedirect): AuthState<TUser> {
    if (!this.#policy.isAllowedRedirect(redirectTo)) {
      throw new AuthError('misconfigured', { message: 'Редирект на недоверенный адрес запрещён' });
    }
    // Сначала переход: если он не удался, состояние не должно застрять в redirecting.
    this.#platform.navigate(this.#policy.resolve(redirectTo));
    this.#store.patch({ phase: 'redirecting' });
    return this.getSnapshot();
  }

  // Вход завершился, когда пользователь уже вышел. Сессию на сервере надо закрыть, иначе
  // она поднимется при следующей загрузке страницы.
  async #revokeOrphan(grant: AuthGrant<TCredentials, TUser>): Promise<void> {
    await withDeadline(this.#logoutTimeoutMs, async (signal) => {
      await this.#strategy.logout?.({ credentials: grant.credentials, signal });
    }).catch(() => undefined);
  }

  async #runLogout(): Promise<AuthState<TUser>> {
    const { status } = this.getSnapshot();
    const isPending = this.#platform.markers.has(this.#pendingLogoutKey);
    if (status === 'guest' && !isPending) return this.getSnapshot();

    const credentials = this.#credentials;
    this.#signOuts += 1;
    if (status !== 'guest') {
      this.#endSession({ type: 'logout', origin: 'local' });
      this.#postToTabs({ type: 'logout' });
    }
    await this.#revokeOnServer(credentials);
    await this.#storage.idle();
    return this.getSnapshot();
  }

  // HttpOnly-cookie из JS не удалить. Если сервер недоступен, запоминаем намерение
  // и довершаем выход при следующей возможности.
  async #revokeOnServer(credentials: TCredentials | null): Promise<void> {
    if (!this.#strategy.logout) return;
    this.#platform.markers.set(this.#pendingLogoutKey);
    const finished = this.#exclusive(() => this.#tryServerLogout(credentials));
    // За блокировкой может стоять зависший refresh. Выход на сервере дойдёт сам, а вызывающего
    // держать долго нельзя: состояние уже сброшено, и приложению пора уводить пользователя.
    await withDeadline(this.#logoutTimeoutMs, () => finished).catch(() => undefined);
  }

  async #tryServerLogout(credentials: TCredentials | null): Promise<boolean> {
    try {
      await withDeadline(this.#logoutTimeoutMs, async (signal) => {
        await this.#strategy.logout?.({ credentials, signal });
      });
    } catch (cause) {
      if (toAuthError(cause).code !== 'unauthorized') return false;
    }
    this.#platform.markers.delete(this.#pendingLogoutKey);
    return true;
  }

  /** Возвращает `true`, если выход всё ещё не удалось довести до сервера. */
  async #flushPendingLogout(): Promise<boolean> {
    if (!this.#strategy.logout || !this.#platform.markers.has(this.#pendingLogoutKey)) return false;
    return !(await this.#tryServerLogout(null));
  }

  #openSession(
    grant: AuthGrant<TCredentials, TUser>,
    { origin, announce }: { origin: AuthOrigin; announce: boolean },
  ): void {
    const user = grant.user ?? null;
    const wasAuthenticated = this.getSnapshot().status === 'authenticated';
    const previous = this.#currentIdentity();
    const next = user === null ? null : (this.#config.identify?.(user) ?? null);
    // Сравнить нечем, значит считаем, что пользователь сменился: лишний сброс кэша безопаснее.
    const identityChanged = wasAuthenticated && (previous === null || previous !== next);

    this.#advanceEpoch();
    this.#adoptCredentials(grant);

    const kickReason = user === null ? null : (this.#config.assessUser?.(user) ?? null);
    if (kickReason !== null) {
      this.#kick(kickReason, null, true);
      return;
    }

    this.#store.patch({
      status: 'authenticated',
      phase: 'idle',
      user,
      error: null,
      updatedAt: this.#platform.now(),
    });
    this.#persist();
    if (announce) {
      this.#store.emit({ type: 'login', state: this.getSnapshot(), origin, identityChanged });
    }
    this.#announceReady();
    if (user === null) void this.refreshUser();
  }

  #clearSession(): void {
    this.#advanceEpoch();
    this.#credentials = null;
    this.#expiresAt = null;
    this.#renewAt = null;
    this.#version += 1;
    this.#renewFailure = null;
    this.#renewBlockedUntil = 0;
    this.#renewBackoff.reset();
    this.#cancelBootstrapRetry();
    this.#store.patch({ status: 'guest', phase: 'idle', user: null, error: null, updatedAt: null });
    const { persistence } = this.#config;
    if (persistence) this.#storage.add(() => persistence.clear());
  }

  #endSession(end: SessionEnd): void {
    this.#clearSession();
    this.#store.emit({ ...end, state: this.getSnapshot() });
    this.#announceReady();
  }

  #kick(reason: AuthKickReason, error: AuthError | null, force = false): void {
    if (this.#isDestroyed) return;
    if (!force && this.getSnapshot().status !== 'authenticated') return;
    this.#signOuts += 1;
    this.#endSession({ type: 'kick', origin: 'local', reason, error });
    this.#postToTabs({ type: 'kick', reason });
  }

  #advanceEpoch(): void {
    this.#epoch += 1;
    // Новая сессия не должна присоединяться к операциям старой: у неё свои запросы.
    this.#renewal = null;
    this.#userRefresh = null;
  }

  #adoptCredentials(grant: AuthGrant<TCredentials, TUser>): void {
    const now = this.#platform.now();
    const ttl = grant.expiresInMs ?? null;
    this.#credentials = grant.credentials;
    this.#version += 1;
    if (ttl === null || !Number.isFinite(ttl)) {
      this.#expiresAt = null;
      this.#renewAt = null;
      return;
    }
    this.#expiresAt = now + ttl;
    this.#renewAt = now + Math.max(ttl - this.#renewLeewayMs, ttl / 2, MIN_RENEW_DELAY_MS);
  }

  /** Применяет обновлённые реквизиты. Если сменился пользователь, это уже другая сессия. */
  #applyRenewedGrant(grant: AuthGrant<TCredentials, TUser>): void {
    const user = grant.user ?? null;
    if (user !== null && this.#isDifferentUser(user)) {
      this.#openSession(grant, { origin: 'remote', announce: true });
      return;
    }
    const kickReason = user === null ? null : (this.#config.assessUser?.(user) ?? null);
    if (kickReason !== null) {
      this.#kick(kickReason, null);
      return;
    }
    this.#adoptCredentials(grant);
    this.#store.patch({
      ...(user === null ? {} : { user }),
      phase: 'idle',
      error: null,
      updatedAt: this.#platform.now(),
    });
    this.#persist();
    this.#store.emit({ type: 'renewed', state: this.getSnapshot() });
  }

  #applyUser(user: TUser): void {
    const kickReason = this.#config.assessUser?.(user) ?? null;
    if (kickReason !== null) {
      this.#kick(kickReason, null);
      return;
    }
    this.#store.patch({ user, updatedAt: this.#platform.now() });
    this.#persist();
    this.#store.emit({ type: 'user', state: this.getSnapshot() });
  }

  #persist(): void {
    const { persistence } = this.#config;
    if (!persistence || this.#credentials === null) return;
    const session: PersistedSession<TCredentials, TUser> = {
      credentials: this.#credentials,
      user: this.getSnapshot().user,
      expiresAt: this.#expiresAt,
    };
    this.#storage.add(() => persistence.save(session));
  }

  #announceReady(): void {
    if (this.#isReadyAnnounced || this.getSnapshot().status === 'unknown') return;
    this.#isReadyAnnounced = true;
    this.#store.emit({ type: 'ready', state: this.getSnapshot() });
  }

  #currentIdentity(): string | null {
    const { user } = this.getSnapshot();
    return user === null ? null : (this.#config.identify?.(user) ?? null);
  }

  #isDifferentUser(user: TUser): boolean {
    const previous = this.#currentIdentity();
    const next = this.#config.identify?.(user) ?? null;
    return previous !== null && next !== null && previous !== next;
  }

  // ---------------------------------------------------------------------------
  // Обновление реквизитов
  // ---------------------------------------------------------------------------

  #needsRenewal(): boolean {
    if (!this.#strategy.renew || this.#credentials === null || this.#renewAt === null) return false;
    return this.#platform.now() >= this.#renewAt;
  }

  #isExpired(): boolean {
    return this.#expiresAt !== null && this.#platform.now() >= this.#expiresAt;
  }

  /** Один refresh на все ждущие запросы. Промис всегда выполняется, а не отклоняется. */
  #renew(): Promise<RenewalOutcome> {
    if (this.#renewal !== null) return this.#renewal;
    if (this.#renewFailure !== null && this.#platform.now() < this.#renewBlockedUntil) {
      return Promise.resolve({ ok: false, error: this.#renewFailure });
    }
    const epoch = this.#epoch;
    this.#store.patch({ phase: 'renewing' });
    const run = this.#performRenewal(epoch).finally(() => {
      if (this.#renewal === run) this.#renewal = null;
      if (this.getSnapshot().phase === 'renewing') this.#store.patch({ phase: 'idle' });
    });
    this.#renewal = run;
    return run;
  }

  async #performRenewal(epoch: number): Promise<RenewalOutcome> {
    const outdated: RenewalOutcome = { ok: false, error: sessionChanged() };
    try {
      const grant = await this.#exclusive(async () => {
        if (epoch !== this.#epoch) return null;
        return withDeadline(this.#operationTimeoutMs, async (signal) => {
          const renewed = await this.#strategy.renew?.({ credentials: this.#credentials, signal });
          if (renewed === undefined) throw new AuthError('misconfigured');
          return renewed;
        });
      });
      if (grant === null || epoch !== this.#epoch) return outdated;
      this.#renewFailure = null;
      this.#renewBlockedUntil = 0;
      this.#renewBackoff.reset();
      this.#applyRenewedGrant(grant);
      return { ok: true };
    } catch (cause) {
      if (epoch !== this.#epoch) return outdated;
      const error = toAuthError(cause);
      // Только 401 значит, что сессии больше нет. Сеть, 5xx и 403 её не закрывают.
      if (error.code === 'unauthorized') {
        this.#kick('unauthorized', error);
        return { ok: false, error };
      }
      this.#renewFailure = error;
      this.#renewBlockedUntil =
        this.#platform.now() + (error.retryAfterMs ?? this.#renewBackoff.next());
      this.#store.patch({ error });
      return { ok: false, error };
    }
  }

  async #assess(response: AuthResponseInfo, credentials: TCredentials): Promise<AuthVerdict> {
    if (this.#strategy.assess) return this.#strategy.assess(response, credentials);
    if (response.status !== 401) return PASS;
    return this.#strategy.renew ? RENEW : REJECT;
  }

  async #awaitSettledSession(signal: AbortSignal | undefined): Promise<void> {
    if (this.getSnapshot().status === 'unknown' && !this.#isBootstrapAttempted) void this.bootstrap();
    if (this.#bootstrapRun !== null) await abortable(this.#bootstrapRun, signal);
    if (this.#resyncRun !== null) await abortable(this.#resyncRun, signal);
    if (this.#renewal !== null) await abortable(this.#renewal, signal);
  }

  #anonymousAttempt(isRetry: boolean): AuthAttempt {
    return {
      headers: {},
      ticket: { authorized: false, epoch: this.#epoch, version: this.#version, isRetry },
    };
  }

  #exclusive<T>(task: () => Promise<T>): Promise<T> {
    return this.#platform.withLock(this.#lockName, task, {
      timeoutMs: this.#operationTimeoutMs + LOCK_GRACE_MS,
    });
  }

  // ---------------------------------------------------------------------------
  // Вкладки и жизненный цикл страницы
  // ---------------------------------------------------------------------------

  #connect(): void {
    if (this.#isConnected || this.#isDestroyed) return;
    this.#isConnected = true;
    const channel = this.#platform.openChannel(this.#channelName);
    if (channel) {
      this.#channel = channel;
      this.#disposers.push(
        channel.subscribe((raw) => this.#onTabMessage(raw)),
        () => {
          this.#channel = null;
          channel.close();
        },
      );
    }
    this.#disposers.push(
      this.#platform.onOnline(() => this.#onOnline()),
      this.#platform.onResume((info) => this.#onResume(info)),
    );
  }

  #postToTabs(message: TabMessage): void {
    this.#channel?.post(message);
  }

  #onTabMessage(raw: unknown): void {
    const message = parseTabMessage(raw);
    if (message === null || this.#isDestroyed) return;
    const { status } = this.getSnapshot();
    switch (message.type) {
      case 'logout':
        this.#signOuts += 1;
        if (status !== 'guest') this.#endSession({ type: 'logout', origin: 'remote' });
        return;
      case 'kick':
        this.#signOuts += 1;
        if (status !== 'guest') {
          this.#endSession({ type: 'kick', origin: 'remote', reason: message.reason, error: null });
        }
        return;
      case 'login':
        // Вошёл тот же пользователь: у этой вкладки свой рабочий токен, сверять нечего.
        if (status === 'authenticated' && message.identity !== null && message.identity === this.#currentIdentity()) {
          return;
        }
        void this.#resync();
        return;
    }
  }

  #onOnline(): void {
    this.#renewBackoff.reset();
    this.#renewBlockedUntil = 0;
    this.#renewFailure = null;
    if (this.getSnapshot().status === 'unknown') void this.bootstrap();
    if (this.#platform.markers.has(this.#pendingLogoutKey)) {
      void this.#exclusive(() => this.#flushPendingLogout()).catch(() => undefined);
    }
  }

  #onResume({ restoredFromCache }: AuthResumeInfo): void {
    const { status } = this.getSnapshot();
    if (status === 'unknown') {
      void this.bootstrap();
      return;
    }
    if (restoredFromCache) {
      void this.#resync();
      return;
    }
    const revalidateAfterMs = this.#config.revalidateAfterMs ?? REVALIDATE_AFTER_MS;
    if (status === 'authenticated' && this.#platform.now() - this.#userCheckedAt >= revalidateAfterMs) {
      void this.refreshUser();
    }
  }

  /** Сверить состояние вкладки с сервером: в другой вкладке вошли, страница вернулась из bfcache. */
  #resync(): Promise<void> {
    if (this.#resyncRun !== null) return this.#resyncRun;
    const run = this.#runResync().finally(() => {
      if (this.#resyncRun === run) this.#resyncRun = null;
    });
    this.#resyncRun = run;
    return run;
  }

  async #runResync(): Promise<void> {
    const epoch = this.#epoch;
    try {
      const grant = await this.#exclusive(() =>
        withDeadline(this.#operationTimeoutMs, (signal) => this.#restore(signal)),
      );
      if (epoch === this.#epoch) this.#applyResync(grant);
    } catch (cause) {
      const error = toAuthError(cause);
      if (epoch !== this.#epoch) return;
      if (error.code === 'unauthorized') {
        this.#applyResync(null);
      } else if (this.getSnapshot().phase === 'redirecting') {
        this.#store.patch({ phase: 'idle' });
      }
    }
  }

  #applyResync(grant: AuthGrant<TCredentials, TUser> | null): void {
    const { status } = this.getSnapshot();
    if (grant !== null) {
      if (status === 'authenticated') this.#applyRenewedGrant(grant);
      else this.#openSession(grant, { origin: 'remote', announce: true });
      return;
    }
    if (status === 'authenticated') this.#endSession({ type: 'logout', origin: 'remote' });
    else if (this.getSnapshot().phase !== 'idle') this.#store.patch({ phase: 'idle' });
  }

  #scheduleBootstrapRetry(): void {
    if (this.#isDestroyed || this.#bootstrapRetry !== null) return;
    this.#bootstrapRetry = setTimeout(() => {
      this.#bootstrapRetry = null;
      void this.bootstrap();
    }, this.#bootstrapBackoff.next());
  }

  #cancelBootstrapRetry(): void {
    if (this.#bootstrapRetry !== null) clearTimeout(this.#bootstrapRetry);
    this.#bootstrapRetry = null;
  }
}
