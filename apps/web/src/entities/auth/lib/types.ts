import type { AuthFetch } from './adapters/fetch';
import type { AuthError } from './errors';

export type MaybePromise<T> = T | Promise<T>;
export type Unsubscribe = () => void;

/** `unknown`: сессия ещё не проверена, экран не должен мигать гостем. */
export type AuthStatus = 'unknown' | 'authenticated' | 'guest';
export type AuthPhase =
  'idle' | 'restoring' | 'signing-in' | 'renewing' | 'redirecting';

/** Снимок не содержит секретов: его можно класть в React, Redux и devtools. */
export interface AuthState<TUser> {
  readonly status: AuthStatus;
  readonly phase: AuthPhase;
  readonly user: TUser | null;
  /** Последняя преодолимая проблема: сеть, 5xx. Сессию она не закрывает. */
  readonly error: AuthError | null;
  readonly updatedAt: number | null;
}

/** `remote`: событие пришло из другой вкладки. */
export type AuthOrigin = 'local' | 'remote';
export type AuthKickReason = 'unauthorized' | (string & {});

export type AuthEvent<TUser> =
  | { readonly type: 'ready'; readonly state: AuthState<TUser> }
  | {
      readonly type: 'login';
      readonly state: AuthState<TUser>;
      readonly origin: AuthOrigin;
      /** Вошёл другой пользователь: данные прошлого нельзя показывать. */
      readonly identityChanged: boolean;
    }
  | {
      readonly type: 'logout';
      readonly state: AuthState<TUser>;
      readonly origin: AuthOrigin;
    }
  | {
      readonly type: 'kick';
      readonly state: AuthState<TUser>;
      readonly origin: AuthOrigin;
      readonly reason: AuthKickReason;
      readonly error: AuthError | null;
    }
  | { readonly type: 'renewed'; readonly state: AuthState<TUser> }
  | { readonly type: 'user'; readonly state: AuthState<TUser> };

export interface AuthEventSource<TUser = unknown> {
  readonly on: (listener: (event: AuthEvent<TUser>) => void) => Unsubscribe;
}

export interface AuthTarget {
  readonly url: string;
  readonly method: string;
}

/** Чем стратегия подписывает запрос. */
export interface AuthDecoration {
  readonly headers?: Readonly<Record<string, string>>;
  /** Режим `credentials` у fetch. Не задан: остаётся значение вызывающего кода. */
  readonly credentialsMode?: 'include' | 'omit' | 'same-origin';
}

/** Запоминает, с какой сессией и какими реквизитами ушёл запрос. Секретов нет. */
export interface AuthTicket {
  readonly authorized: boolean;
  readonly epoch: number;
  readonly version: number;
  readonly isRetry: boolean;
}

export interface AuthAttempt extends AuthDecoration {
  readonly headers: Readonly<Record<string, string>>;
  readonly ticket: AuthTicket;
}

export interface AuthResponseInfo {
  readonly status: number;
  header(name: string): string | null;
  /** Тело как JSON. Читается лениво, только если стратегии оно нужно. */
  json(): Promise<unknown>;
}

export type AuthVerdict =
  /** Ответ не про авторизацию. */
  | { readonly action: 'pass' }
  /** Реквизиты устарели: обновить и повторить запрос. */
  | { readonly action: 'renew' }
  /** Стратегия уже поправила реквизиты сама (digest nonce): просто повторить. */
  | { readonly action: 'retry' }
  /** Сессия мертва. */
  | { readonly action: 'reject'; readonly reason?: AuthKickReason };

export interface AuthGrant<TCredentials, TUser> {
  readonly credentials: TCredentials;
  readonly user?: TUser | null;
  /** Срок жизни от момента получения. Длительность, а не дата: часы клиента могут врать. */
  readonly expiresInMs?: number | null;
}

/** Вход уводит браузер на другую страницу: SSO, OAuth, SAML. */
export interface AuthRedirect {
  readonly redirectTo: string;
}

export interface StrategyContext {
  readonly signal: AbortSignal;
}

export interface CredentialContext<TCredentials> extends StrategyContext {
  readonly credentials: TCredentials | null;
}

export interface RestoreContext<TCredentials, TUser> extends StrategyContext {
  readonly stored: PersistedSession<TCredentials, TUser> | null;
}

/**
 * Вариант авторизации: Bearer, cookie-сессия, API-ключ, Basic, Digest, свой.
 * Сервис не знает, что внутри `TCredentials`. Запросы самой стратегии идут мимо
 * авторизованного конвейера, иначе refresh ждал бы сам себя.
 */
export interface AuthStrategy<TCredentials, TUser, TLoginInput> {
  readonly name: string;
  /** Холодный старт. `null`: сессии нет. */
  restore(
    context: RestoreContext<TCredentials, TUser>,
  ): Promise<AuthGrant<TCredentials, TUser> | null>;
  login(
    input: TLoginInput,
    context: StrategyContext,
  ): Promise<AuthGrant<TCredentials, TUser> | AuthRedirect>;
  /** Нет метода: реквизиты не обновляются, и 401 означает конец сессии. */
  renew?(
    context: CredentialContext<TCredentials>,
  ): Promise<AuthGrant<TCredentials, TUser>>;
  /** `credentials: null` бывает при отложенном выходе: уже после перезагрузки страницы. */
  logout?(context: CredentialContext<TCredentials>): Promise<void>;
  decorate(
    credentials: TCredentials,
    target: AuthTarget,
  ): MaybePromise<AuthDecoration>;
  /** По умолчанию 401 ведёт к `renew` или, если обновляться нечем, к `reject`. */
  assess?(
    response: AuthResponseInfo,
    credentials: TCredentials,
  ): MaybePromise<AuthVerdict>;
}

export interface PersistedSession<TCredentials, TUser> {
  readonly credentials: TCredentials;
  readonly user: TUser | null;
  readonly expiresAt: number | null;
}

/**
 * Хранилище между запусками. Одна запись на всё, чтобы токен и профиль не разъехались.
 * В браузере не нужно: access живёт в памяти, refresh в httpOnly-cookie. Это для
 * нативных приложений с Keychain и Keystore. localStorage сюда передавать нельзя:
 * токен оттуда читается любым XSS.
 */
export interface AuthPersistence<TCredentials, TUser> {
  load(): MaybePromise<PersistedSession<TCredentials, TUser> | null>;
  save(session: PersistedSession<TCredentials, TUser>): MaybePromise<void>;
  clear(): MaybePromise<void>;
}

export interface FetchUserContext {
  /** Авторизованный fetch: сам обновит токен и повторит запрос. */
  readonly fetch: AuthFetch;
  readonly signal: AbortSignal;
}

export interface PrepareOptions {
  readonly signal?: AbortSignal;
  /** Не подписывать запрос. */
  readonly skip?: boolean;
  /** Билет первой попытки. Запрещает повтор, если сессия успела смениться. */
  readonly retryOf?: AuthTicket;
}

export interface SettleOptions {
  readonly signal?: AbortSignal;
}

export type AuthSettlement = 'done' | 'retry';

export interface ExecuteOptions<TResult> {
  readonly signal?: AbortSignal;
  readonly skip?: boolean;
  /** По умолчанию статус берётся из поля `status` результата. */
  readonly inspect?: (result: TResult) => MaybePromise<AuthResponseInfo | null>;
  /** Для клиентов, которые бросают исключение на статус ошибки. */
  readonly inspectError?: (error: unknown) => AuthResponseInfo | null;
  /** Освободить результат первой попытки перед повтором. */
  readonly discard?: (result: TResult) => void;
}

/** Всё, что нужно адаптеру HTTP-библиотеки. */
export interface AuthPipeline {
  readonly prepare: (
    target: AuthTarget,
    options?: PrepareOptions,
  ) => Promise<AuthAttempt>;
  readonly settle: (
    attempt: Pick<AuthAttempt, 'ticket'>,
    response: AuthResponseInfo,
    options?: SettleOptions,
  ) => Promise<AuthSettlement>;
  readonly execute: <TResult>(
    target: AuthTarget,
    send: (attempt: AuthAttempt) => Promise<TResult>,
    options?: ExecuteOptions<TResult>,
  ) => Promise<TResult>;
  readonly resolveUrl: (url: string) => string;
}
