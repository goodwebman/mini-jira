import type { Me } from '@gwmt/contracts';
import { authApi, fetchMe, type CredentialsInput } from '../api/auth-api';
import {
  AuthService,
  BearerStrategy,
  withSsoRedirect,
  type BearerCredentials,
  type SsoLoginInput,
} from '../lib';

export type OAuthProvider = 'github' | 'google';
export type AuthLoginInput = CredentialsInput | (SsoLoginInput & { readonly sso: OAuthProvider });

const strategy = withSsoRedirect<BearerCredentials, Me, CredentialsInput, OAuthProvider>(
  new BearerStrategy({ api: authApi }),
  {
    buildUrl: (provider, returnTo) =>
      `/api/v1/auth/${provider}/start?next=${encodeURIComponent(returnTo)}`,
    defaultReturnTo: '/boards',
  },
);

/** Единственный экземпляр на приложение. Это SPA: для SSR экземпляр нужен на запрос. */
export const authService = new AuthService<Me, AuthLoginInput, BearerCredentials>({
  strategy,
  namespace: 'gwmt-auth',
  identify: (user) => user.id,
  fetchUser: fetchMe,
});

// При HMR модуль создаётся заново. Старый экземпляр продолжил бы слушать канал вкладок.
import.meta.hot?.dispose(() => authService.destroy());
