import { sanitizeReturnTo } from '../origin-policy';
import type { AuthStrategy } from '../types';

export interface SsoLoginInput {
  /** Имя провайдера: `google`, `github`, `okta`. */
  readonly sso: string;
  readonly returnTo?: string;
}

export interface SsoRedirectOptions<TProvider extends string> {
  /** Адрес, с которого сервер начинает вход у провайдера. */
  readonly buildUrl: (provider: TProvider, returnTo: string) => string;
  readonly defaultReturnTo?: string;
}

function isSsoInput(input: unknown): input is SsoLoginInput {
  return (
    typeof input === 'object' &&
    input !== null &&
    typeof (input as SsoLoginInput).sso === 'string'
  );
}

/**
 * Добавляет вход через SSO к любой стратегии. Обмен кода и токены остаются на сервере
 * (паттерн BFF, рекомендован IETF для браузерных приложений): фронт лишь уводит пользователя
 * на сервер, а по возвращении `bootstrap()` поднимает сессию по cookie.
 */
export function withSsoRedirect<
  TCredentials,
  TUser,
  TLoginInput,
  TProvider extends string = string,
>(
  strategy: AuthStrategy<TCredentials, TUser, TLoginInput>,
  options: SsoRedirectOptions<TProvider>,
): AuthStrategy<
  TCredentials,
  TUser,
  TLoginInput | (SsoLoginInput & { sso: TProvider })
> {
  return {
    name: `${strategy.name}+sso`,
    restore: (context) => strategy.restore(context),
    decorate: (credentials, target) => strategy.decorate(credentials, target),
    login: async (input, context) => {
      if (!isSsoInput(input))
        return strategy.login(input as TLoginInput, context);
      const returnTo = sanitizeReturnTo(
        input.returnTo,
        options.defaultReturnTo,
      );
      return { redirectTo: options.buildUrl(input.sso as TProvider, returnTo) };
    },
    ...(strategy.renew
      ? { renew: (context) => strategy.renew?.(context) as never }
      : {}),
    ...(strategy.logout
      ? { logout: async (context) => strategy.logout?.(context) }
      : {}),
    ...(strategy.assess
      ? {
          assess: (response, credentials) =>
            strategy.assess?.(response, credentials) as never,
        }
      : {}),
  };
}
