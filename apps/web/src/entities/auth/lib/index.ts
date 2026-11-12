// Переносимое ядро: не импортирует ничего за пределами этой папки.

export { AuthService, type AuthServiceConfig } from './auth-service';
export { isSessionBoundary } from './auth-store';
export {
  AuthError,
  isAuthError,
  toAuthError,
  type AuthErrorBodyReader,
  type AuthErrorCode,
} from './errors';
export { sanitizeReturnTo } from './origin-policy';
export {
  createBrowserPlatform,
  detectPlatform,
  type BrowserScope,
} from './platform/browser-platform';
export { createMemoryPlatform } from './platform/memory-platform';
export type {
  AuthChannel,
  AuthMarkers,
  AuthPlatform,
  AuthResumeInfo,
} from './platform/types';
export type * from './types';

export {
  createAuthFetch,
  type AuthFetch,
  type AuthRequestInit,
  type CreateAuthFetchOptions,
} from './adapters/fetch';
export { attachAuthToAxios, type AxiosLike } from './adapters/axios';
export { graphqlEffectiveStatus } from './adapters/graphql';
export {
  bindAuthToRtkQuery,
  type RtkApiLike,
  type RtkStoreLike,
} from './adapters/rtk-query';
export {
  bindAuthToQueryClient,
  shouldRetryQuery,
  type QueryClientLike,
} from './adapters/tanstack-query';

export {
  ApiKeyStrategy,
  type ApiKeyCredentials,
  type ApiKeyLoginInput,
  type ApiKeyStrategyOptions,
} from './strategies/api-key.strategy';
export {
  BasicStrategy,
  type BasicCredentials,
  type BasicLoginInput,
  type BasicStrategyOptions,
} from './strategies/basic.strategy';
export {
  BearerStrategy,
  type BearerApi,
  type BearerApiContext,
  type BearerCredentials,
  type BearerStrategyOptions,
  type BearerTokens,
} from './strategies/bearer.strategy';
export {
  DigestStrategy,
  type DigestCredentials,
  type DigestLoginInput,
  type DigestStrategyOptions,
} from './strategies/digest.strategy';
export { readJwtTtlMs } from './strategies/jwt';
export {
  SessionCookieStrategy,
  type SessionCookieApi,
  type SessionCookieCredentials,
  type SessionCookieStrategyOptions,
} from './strategies/session-cookie.strategy';
export {
  withSsoRedirect,
  type SsoLoginInput,
  type SsoRedirectOptions,
} from './strategies/sso-redirect';
