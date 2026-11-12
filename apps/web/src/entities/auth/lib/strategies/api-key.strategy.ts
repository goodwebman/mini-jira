import { AuthError } from '../errors';
import type {
  AuthDecoration,
  AuthGrant,
  AuthStrategy,
  MaybePromise,
  RestoreContext,
  StrategyContext,
} from '../types';

export interface ApiKeyCredentials {
  readonly apiKey: string;
}

export interface ApiKeyLoginInput {
  readonly apiKey: string;
}

export interface ApiKeyStrategyOptions<TUser> {
  /** Ключ из конфигурации: сервер или расширение. На веб-странице так ключ утечёт в бандл. */
  readonly provideKey?: () => MaybePromise<null | string>;
  readonly headerName?: string;
  /** Проверяет ключ и возвращает пользователя. На неверный ключ бросает ошибку со статусом 401. */
  readonly verify?: (
    headers: Readonly<Record<string, string>>,
    context: StrategyContext,
  ) => Promise<TUser>;
}

/** Ключ только в заголовке. В URL он осел бы в логах, истории и `Referer`. */
export class ApiKeyStrategy<TUser> implements AuthStrategy<
  ApiKeyCredentials,
  TUser,
  ApiKeyLoginInput
> {
  readonly name = 'api-key';
  readonly #options: ApiKeyStrategyOptions<TUser>;
  readonly #headerName: string;

  constructor(options: ApiKeyStrategyOptions<TUser> = {}) {
    this.#options = options;
    this.#headerName = options.headerName ?? 'X-API-Key';
  }

  async restore({
    signal,
  }: RestoreContext<ApiKeyCredentials, TUser>): Promise<AuthGrant<
    ApiKeyCredentials,
    TUser
  > | null> {
    const apiKey = await this.#options.provideKey?.();
    return apiKey ? this.#open(apiKey, { signal }) : null;
  }

  async login(
    { apiKey }: ApiKeyLoginInput,
    context: StrategyContext,
  ): Promise<AuthGrant<ApiKeyCredentials, TUser>> {
    if (!apiKey)
      throw new AuthError('bad_request', { message: 'Пустой API-ключ' });
    return this.#open(apiKey, context);
  }

  decorate({ apiKey }: ApiKeyCredentials): AuthDecoration {
    return { headers: { [this.#headerName]: apiKey } };
  }

  async #open(
    apiKey: string,
    context: StrategyContext,
  ): Promise<AuthGrant<ApiKeyCredentials, TUser>> {
    const user = await this.#options.verify?.(
      { [this.#headerName]: apiKey },
      context,
    );
    return { credentials: { apiKey }, user };
  }
}
