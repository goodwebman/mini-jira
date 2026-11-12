import { AuthError } from '../errors';
import type {
  AuthDecoration,
  AuthGrant,
  AuthStrategy,
  StrategyContext,
} from '../types';

export interface BasicCredentials {
  readonly authorization: string;
}

export interface BasicLoginInput {
  readonly username: string;
  readonly password: string;
}

export interface BasicStrategyOptions<TUser> {
  /** Проверяет реквизиты на сервере. На неверные бросает ошибку со статусом 401. */
  readonly verify: (
    authorization: string,
    context: StrategyContext,
  ) => Promise<TUser>;
}

/** `btoa` падает на кириллице, поэтому сначала UTF-8 (RFC 7617, charset). */
function encodeBase64(value: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(value))
    binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * RFC 7617. Пароль уходит с каждым запросом, поэтому только поверх HTTPS.
 * В памяти держится закодированный заголовок, исходный пароль не сохраняется.
 * После перезагрузки страницы сессии нет: хранить реквизиты негде безопасно.
 */
export class BasicStrategy<TUser> implements AuthStrategy<
  BasicCredentials,
  TUser,
  BasicLoginInput
> {
  readonly name = 'basic';
  readonly #verify: BasicStrategyOptions<TUser>['verify'];

  constructor(options: BasicStrategyOptions<TUser>) {
    this.#verify = options.verify;
  }

  async restore(): Promise<AuthGrant<BasicCredentials, TUser> | null> {
    return null;
  }

  async login(
    { username, password }: BasicLoginInput,
    context: StrategyContext,
  ): Promise<AuthGrant<BasicCredentials, TUser>> {
    if (username.includes(':')) {
      throw new AuthError('bad_request', {
        message: 'Логин Basic не может содержать двоеточие',
      });
    }
    const encoded = encodeBase64(`${username}:${password}`);
    const authorization = `Basic ${encoded}`;
    return {
      credentials: { authorization },
      user: await this.#verify(authorization, context),
    };
  }

  // `omit` отключает родное окно логина браузера на 401 с `WWW-Authenticate: Basic`.
  decorate({ authorization }: BasicCredentials): AuthDecoration {
    return {
      headers: { Authorization: authorization },
      credentialsMode: 'omit',
    };
  }
}
