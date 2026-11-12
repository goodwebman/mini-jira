import type { Env } from '../../lib/env.js';

export type OAuthFailure =
  | 'denied'
  | 'state_mismatch'
  | 'no_verified_email'
  | 'failed'
  | 'email_not_trusted';

export class OAuthFlowError extends Error {
  constructor(readonly failure: OAuthFailure) {
    super(failure);
    this.name = 'OAuthFlowError';
  }
}

export type OAuthIdentity =
  | { provider: 'github'; id: number; name: string; email: string }
  | {
      provider: 'google';
      id: string;
      name: string;
      email: string;
      /** Google подтверждает, что адрес и сейчас принадлежит этому аккаунту. */
      emailAuthoritative: boolean;
    };

export type OAuthProvider = OAuthIdentity['provider'];

export interface OAuthClient {
  provider: OAuthProvider;
  label: string;
  failures: readonly OAuthFailure[];
  failureNote?: string;
  authorizeUrl(env: Env, state: string): string;
  fetchIdentity(env: Env, code: string): Promise<OAuthIdentity>;
}

const MAX_NAME_LENGTH = 100;

export const oauthCallbackUrl = (env: Env, provider: OAuthProvider) =>
  `${env.APP_URL}/api/v1/auth/${provider}/callback`;

export const displayName = (
  name: string | null | undefined,
  fallback: string,
) => (name?.trim() || fallback).slice(0, MAX_NAME_LENGTH);

export async function readOAuthJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new OAuthFlowError('failed');
  return (await response.json()) as T;
}
