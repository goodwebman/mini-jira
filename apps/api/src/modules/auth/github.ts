import type { Env } from '../../lib/env.js';
import {
  type OAuthClient,
  OAuthFlowError,
  type OAuthIdentity,
  displayName,
  oauthCallbackUrl,
  readOAuthJson,
} from './oauth.js';

const API_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'goodWebManTasks',
};

function authorizeUrl(env: Env, state: string): string {
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', oauthCallbackUrl(env, 'github'));
  url.searchParams.set('scope', 'read:user user:email');
  url.searchParams.set('state', state);
  return url.toString();
}

async function fetchIdentity(env: Env, code: string): Promise<OAuthIdentity> {
  const { access_token: accessToken } = await readOAuthJson<{
    access_token?: string;
  }>(
    await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: oauthCallbackUrl(env, 'github'),
      }),
    }),
  );
  if (!accessToken) throw new OAuthFlowError('failed');

  const headers = { ...API_HEADERS, Authorization: `Bearer ${accessToken}` };
  const [profile, emails] = await Promise.all([
    fetch('https://api.github.com/user', { headers }).then((r) =>
      readOAuthJson<{ id: number; login: string; name: string | null }>(r),
    ),
    fetch('https://api.github.com/user/emails', { headers }).then((r) =>
      readOAuthJson<{ email: string; primary: boolean; verified: boolean }[]>(
        r,
      ),
    ),
  ]);

  const primary = emails.find((item) => item.primary && item.verified);
  if (!primary) throw new OAuthFlowError('no_verified_email');

  return {
    provider: 'github',
    id: profile.id,
    name: displayName(profile.name, profile.login),
    email: primary.email,
  };
}

export const githubClient: OAuthClient = {
  provider: 'github',
  label: 'GitHub',
  failures: ['denied', 'state_mismatch', 'no_verified_email', 'failed'],
  authorizeUrl,
  fetchIdentity,
};
