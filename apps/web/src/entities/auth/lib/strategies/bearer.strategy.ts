import { AuthError } from '../errors';
import type {
  AuthDecoration,
  AuthGrant,
  AuthRedirect,
  AuthStrategy,
  CredentialContext,
  RestoreContext,
  StrategyContext,
} from '../types';
import { readJwtTtlMs } from './jwt';

export interface BearerCredentials {
  readonly accessToken: string;
  /** В браузере `null`: refresh живёт в httpOnly-cookie и JS его не видит. */
  readonly refreshToken: string | null;
}

export interface BearerTokens<TUser> {
  readonly accessToken: string;
  readonly refreshToken?: string | null;
  /** Если не задан, срок читается из JWT. Непрозрачный токен обновляется только по 401. */
  readonly expiresInMs?: number | null;
  readonly user?: TUser | null;
}

export interface BearerApiContext extends StrategyContext {
  readonly accessToken: string | null;
  readonly refreshToken: string | null;
}

/** Запросы только через обычный fetch, не через авторизованный. */
export interface BearerApi<TUser, TLoginInput> {
  login(input: TLoginInput, context: StrategyContext): Promise<BearerTokens<TUser> | AuthRedirect>;
  /** Без этого метода получается простой Bearer: 401 заканчивает сессию. */
  refresh?(context: BearerApiContext): Promise<BearerTokens<TUser>>;
  logout?(context: BearerApiContext): Promise<void>;
}

export interface BearerStrategyOptions<TUser, TLoginInput> {
  readonly api: BearerApi<TUser, TLoginInput>;
  /** Формат заголовка, если API ждёт не `Authorization: Bearer`. */
  readonly formatHeaders?: (accessToken: string) => Readonly<Record<string, string>>;
}

const defaultHeaders = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

/** JWT и любые Bearer-токены, с refresh и без него, с refresh в cookie и в теле запроса. */
export class BearerStrategy<TUser, TLoginInput>
  implements AuthStrategy<BearerCredentials, TUser, TLoginInput>
{
  readonly name = 'bearer';
  readonly renew?: (
    context: CredentialContext<BearerCredentials>,
  ) => Promise<AuthGrant<BearerCredentials, TUser>>;
  readonly logout?: (context: CredentialContext<BearerCredentials>) => Promise<void>;

  readonly #api: BearerApi<TUser, TLoginInput>;
  readonly #formatHeaders: (accessToken: string) => Readonly<Record<string, string>>;

  constructor(options: BearerStrategyOptions<TUser, TLoginInput>) {
    const { api } = options;
    this.#api = api;
    this.#formatHeaders = options.formatHeaders ?? defaultHeaders;
    if (api.refresh) this.renew = (context) => this.#refresh(context.credentials, context.signal);
    if (api.logout) {
      this.logout = async ({ credentials, signal }) => {
        await api.logout?.({
          signal,
          accessToken: credentials?.accessToken ?? null,
          refreshToken: credentials?.refreshToken ?? null,
        });
      };
    }
  }

  async restore({
    stored,
    signal,
  }: RestoreContext<BearerCredentials, TUser>): Promise<AuthGrant<BearerCredentials, TUser> | null> {
    if (stored && (stored.expiresAt === null || stored.expiresAt > Date.now())) {
      return {
        credentials: stored.credentials,
        user: stored.user,
        expiresInMs: stored.expiresAt === null ? null : stored.expiresAt - Date.now(),
      };
    }
    if (!this.#api.refresh) return null;
    return this.#refresh(stored?.credentials ?? null, signal);
  }

  async login(
    input: TLoginInput,
    context: StrategyContext,
  ): Promise<AuthGrant<BearerCredentials, TUser> | AuthRedirect> {
    const result = await this.#api.login(input, context);
    return 'redirectTo' in result ? result : this.#toGrant(result, null);
  }

  decorate(credentials: BearerCredentials): AuthDecoration {
    return { headers: this.#formatHeaders(credentials.accessToken) };
  }

  async #refresh(
    credentials: BearerCredentials | null,
    signal: AbortSignal,
  ): Promise<AuthGrant<BearerCredentials, TUser>> {
    const refresh = this.#api.refresh;
    if (!refresh) throw new AuthError('misconfigured');
    const tokens = await refresh({
      signal,
      accessToken: credentials?.accessToken ?? null,
      refreshToken: credentials?.refreshToken ?? null,
    });
    return this.#toGrant(tokens, credentials?.refreshToken ?? null);
  }

  #toGrant(
    tokens: BearerTokens<TUser>,
    previousRefreshToken: string | null,
  ): AuthGrant<BearerCredentials, TUser> {
    const { accessToken } = tokens;
    if (typeof accessToken !== 'string' || accessToken === '' || /\s/.test(accessToken)) {
      throw new AuthError('bad_response', { message: 'Сервер вернул некорректный токен' });
    }
    return {
      credentials: { accessToken, refreshToken: tokens.refreshToken ?? previousRefreshToken },
      user: tokens.user,
      expiresInMs: tokens.expiresInMs ?? readJwtTtlMs(accessToken),
    };
  }
}
