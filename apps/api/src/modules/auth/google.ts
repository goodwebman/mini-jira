import type { Env } from '../../lib/env.js';
import {
  type OAuthClient,
  OAuthFlowError,
  type OAuthIdentity,
  displayName,
  oauthCallbackUrl,
  readOAuthJson,
} from './oauth.js';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

interface GoogleProfile {
  sub?: string;
  name?: string;
  email?: string;
  email_verified?: boolean | string;
  hd?: string;
}

function authorizeUrl(env: Env, state: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', oauthCallbackUrl(env, 'google'));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

/**
 * Правило из документации Google: адрес точно принадлежит владельцу аккаунта только у Gmail
 * и Workspace. У остальных email_verified мог быть выставлен давно, а почта с тех пор сменила владельца.
 */
const isEmailAuthoritative = (
  email: string,
  hostedDomain: string | undefined,
) => email.toLowerCase().endsWith('@gmail.com') || Boolean(hostedDomain);

async function fetchIdentity(env: Env, code: string): Promise<OAuthIdentity> {
  const { access_token: accessToken } = await readOAuthJson<{
    access_token?: string;
  }>(
    await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: oauthCallbackUrl(env, 'google'),
        grant_type: 'authorization_code',
      }),
    }),
  );
  if (!accessToken) throw new OAuthFlowError('failed');

  const profile = await readOAuthJson<GoogleProfile>(
    await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  );
  if (!profile.sub) throw new OAuthFlowError('failed');

  const verified =
    profile.email_verified === true || profile.email_verified === 'true';
  if (!profile.email || !verified)
    throw new OAuthFlowError('no_verified_email');

  return {
    provider: 'google',
    id: profile.sub,
    name: displayName(profile.name, profile.email.split('@')[0] as string),
    email: profile.email,
    emailAuthoritative: isEmailAuthoritative(profile.email, profile.hd),
  };
}

export const googleClient: OAuthClient = {
  provider: 'google',
  label: 'Google',
  failures: [
    'denied',
    'state_mismatch',
    'no_verified_email',
    'failed',
    'email_not_trusted',
  ],
  failureNote:
    '`google_email_not_trusted` значит, что аккаунт с таким email уже есть, а Google не отвечает за этот адрес ' +
    '(это не Gmail и не Workspace). Нужно войти другим способом.',
  authorizeUrl,
  fetchIdentity,
};
