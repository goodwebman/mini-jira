import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Env } from './env.js';

const REFRESH_COOKIE = 'gwmt_refresh';
const REFRESH_PATH = '/api/v1/auth';
const REFRESH_MAX_AGE_SEC = 30 * 24 * 60 * 60;

const OAUTH_COOKIE = 'gwmt_oauth_state';
const OAUTH_MAX_AGE_SEC = 10 * 60;

const refreshOptions = (env: Env) =>
  ({
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: REFRESH_PATH,
  }) as const;

// Lax обязателен: callback приходит переходом с сайта провайдера, и Strict-cookie браузер не отправит.
const oauthOptions = (env: Env, provider: string) =>
  ({
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: `/api/v1/auth/${provider}`,
  }) as const;

export const readRefreshCookie = (c: Context) => getCookie(c, REFRESH_COOKIE);

export function setRefreshCookie(c: Context, token: string, remember: boolean, env: Env) {
  setCookie(c, REFRESH_COOKIE, token, {
    ...refreshOptions(env),
    ...(remember ? { maxAge: REFRESH_MAX_AGE_SEC } : {}),
  });
}

export function clearRefreshCookie(c: Context, env: Env) {
  deleteCookie(c, REFRESH_COOKIE, refreshOptions(env));
}

export const readOAuthCookie = (c: Context) => getCookie(c, OAUTH_COOKIE);

export function setOAuthCookie(c: Context, value: string, env: Env, provider: string) {
  setCookie(c, OAUTH_COOKIE, value, {
    ...oauthOptions(env, provider),
    maxAge: OAUTH_MAX_AGE_SEC,
  });
}

export function clearOAuthCookie(c: Context, env: Env, provider: string) {
  deleteCookie(c, OAUTH_COOKIE, oauthOptions(env, provider));
}
