export {
  authService,
  type AuthLoginInput,
  type OAuthProvider,
} from './model/auth-instance';
export {
  AuthError,
  bindAuthToQueryClient,
  isAuthError,
  shouldRetryQuery,
  type AuthEvent,
  type AuthState,
} from './lib';
export { useAuth } from './model/use-auth';
export { useSessionUser } from './model/use-session-user';
