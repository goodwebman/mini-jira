import type {
  AuthDecoration,
  AuthGrant,
  AuthRedirect,
  AuthStrategy,
  AuthTarget,
  CredentialContext,
  MaybePromise,
  RestoreContext,
  StrategyContext,
} from '../types';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Значение несекретное: сама сессия живёт в httpOnly-cookie, и JS её не видит. */
export type SessionCookieCredentials = 'cookie-session';

export interface SessionCookieApi<TUser, TLoginInput> {
  login(
    input: TLoginInput,
    context: StrategyContext,
  ): Promise<TUser | AuthRedirect>;
  /** На 401 должен бросать ошибку со статусом: так сервис понимает, что сессии нет. */
  getUser(context: StrategyContext): Promise<TUser>;
  logout?(context: StrategyContext): Promise<void>;
}

export interface SessionCookieStrategyOptions<TUser, TLoginInput> {
  readonly api: SessionCookieApi<TUser, TLoginInput>;
  /** Cookie уходит браузером сам, поэтому изменяющие запросы нужно защищать от CSRF. */
  readonly csrf?: {
    readonly headerName: string;
    readonly readToken: () => MaybePromise<string | null>;
  };
  /** `include` нужен, только если API на другом origin. */
  readonly credentialsMode?: 'include' | 'same-origin';
}

/** Классическая серверная сессия: `Set-Cookie` при входе, браузер шлёт cookie сам. */
export class SessionCookieStrategy<TUser, TLoginInput> implements AuthStrategy<
  SessionCookieCredentials,
  TUser,
  TLoginInput
> {
  readonly name = 'session-cookie';
  readonly logout?: (
    context: CredentialContext<SessionCookieCredentials>,
  ) => Promise<void>;

  readonly #options: SessionCookieStrategyOptions<TUser, TLoginInput>;

  constructor(options: SessionCookieStrategyOptions<TUser, TLoginInput>) {
    this.#options = options;
    if (options.api.logout) {
      this.logout = async ({ signal }) => {
        await options.api.logout?.({ signal });
      };
    }
  }

  async restore({
    signal,
  }: RestoreContext<SessionCookieCredentials, TUser>): Promise<AuthGrant<
    SessionCookieCredentials,
    TUser
  > | null> {
    return {
      credentials: 'cookie-session',
      user: await this.#options.api.getUser({ signal }),
    };
  }

  async login(
    input: TLoginInput,
    context: StrategyContext,
  ): Promise<AuthGrant<SessionCookieCredentials, TUser> | AuthRedirect> {
    const result = await this.#options.api.login(input, context);
    if (
      typeof result === 'object' &&
      result !== null &&
      'redirectTo' in result
    ) {
      return result as AuthRedirect;
    }
    return { credentials: 'cookie-session', user: result as TUser };
  }

  async decorate(
    _: SessionCookieCredentials,
    target: AuthTarget,
  ): Promise<AuthDecoration> {
    const { csrf, credentialsMode = 'same-origin' } = this.#options;
    if (!csrf || SAFE_METHODS.has(target.method.toUpperCase()))
      return { credentialsMode };
    const token = await csrf.readToken();
    return {
      credentialsMode,
      headers: token ? { [csrf.headerName]: token } : {},
    };
  }
}
