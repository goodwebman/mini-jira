import {
  authResponseSchema,
  loginBodySchema,
  registerBodySchema,
  saltHeadersSchema,
} from '@gwmt/contracts';
import { createRoute } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

import { TAG } from '../../lib/api-docs.js';
import type { AppDeps, AppEnv } from '../../lib/context.js';
import {
  clearOAuthCookie,
  clearRefreshCookie,
  readOAuthCookie,
  readRefreshCookie,
  setOAuthCookie,
  setRefreshCookie,
} from '../../lib/cookies.js';
import { AppError } from '../../lib/errors.js';
import {
  createRouter,
  errors,
  jsonBody,
  jsonResponse,
  noAuth,
  refreshCookie,
  setsRefreshCookie,
} from '../../lib/router.js';
import { githubClient } from './github.js';
import { googleClient } from './google.js';
import { requireAppOrigin, requireSaltSignature } from './middleware.js';
import {
  type OAuthClient,
  type OAuthFailure,
  OAuthFlowError,
} from './oauth.js';
import * as service from './service.js';

const DEFAULT_NEXT = '/boards';

const safeNext = (next: string | undefined) =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : DEFAULT_NEXT;

const encodeOAuthCookie = (state: string, next: string) =>
  `${state}.${Buffer.from(next).toString('base64url')}`;

function decodeOAuthCookie(value: string | undefined) {
  if (!value) return null;
  const separator = value.indexOf('.');
  if (separator === -1) return null;
  return {
    state: value.slice(0, separator),
    next: Buffer.from(value.slice(separator + 1), 'base64url').toString(),
  };
}

function sameState(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

const tags = [TAG.auth];

const OAUTH_CLIENTS: OAuthClient[] = [githubClient, googleClient];

function registerOAuthRoutes(
  router: ReturnType<typeof createRouter>,
  deps: AppDeps,
  client: OAuthClient,
) {
  const { provider, label } = client;
  const operationName = `${provider.charAt(0).toUpperCase()}${provider.slice(1)}`;
  const failureList = client.failures
    .map((failure) => `\`${provider}_${failure}\``)
    .join(', ');

  router.openapi(
    createRoute({
      method: 'get',
      path: `/auth/${provider}/start`,
      operationId: `start${operationName}Login`,
      tags,
      summary: `Начать вход через ${label}`,
      description: 'Открывается переходом браузера, не через fetch.',
      security: noAuth,
      request: {
        query: z.object({
          next: z.string().optional().meta({
            description:
              'Куда вернуть после входа. Только относительный путь, иначе `/boards`',
            example: '/boards',
          }),
        }),
      },
      responses: { 302: { description: `Редирект на ${label}` } },
    }),
    (c) => {
      const state = randomBytes(32).toString('base64url');
      const value = encodeOAuthCookie(
        state,
        safeNext(c.req.valid('query').next),
      );
      setOAuthCookie(c, value, deps.env, provider);
      return c.redirect(client.authorizeUrl(deps.env, state), 302);
    },
  );

  router.openapi(
    createRoute({
      method: 'get',
      path: `/auth/${provider}/callback`,
      operationId: `finish${operationName}Login`,
      tags,
      summary: `Возврат с ${label}`,
      description: `Вызывает ${label}, не фронт. Токены в URL не передаются: после редиректа фронт получает access обычным \`POST /auth/refresh\`.`,
      security: noAuth,
      request: {
        query: z.object({
          code: z.string().optional(),
          state: z.string().optional(),
          error: z.string().optional(),
        }),
      },
      responses: {
        302: {
          description: [
            `Успех: \`APP_URL + next\` и refresh-cookie. Ошибка: \`/login?authError=\` со значением ${failureList}.`,
            client.failureNote,
          ]
            .filter(Boolean)
            .join(' '),
        },
      },
    }),
    async (c) => {
      const { code, state, error } = c.req.valid('query');
      const saved = decodeOAuthCookie(readOAuthCookie(c));
      clearOAuthCookie(c, deps.env, provider);

      const fail = (failure: OAuthFailure) =>
        c.redirect(
          `${deps.env.APP_URL}/login?authError=${provider}_${failure}`,
          302,
        );

      if (!saved || !state || !sameState(saved.state, state))
        return fail('state_mismatch');
      if (error || !code) return fail('denied');

      try {
        const identity = await client.fetchIdentity(deps.env, code);
        const { refreshToken } = await service.loginWithOAuth(
          deps,
          identity,
          c.req.header('User-Agent') ?? null,
        );
        setRefreshCookie(c, refreshToken, true, deps.env);
        return c.redirect(`${deps.env.APP_URL}${safeNext(saved.next)}`, 302);
      } catch (err) {
        return fail(err instanceof OAuthFlowError ? err.failure : 'failed');
      }
    },
  );
}

export function authRoutes(deps: AppDeps) {
  const router = createRouter();
  const sameOrigin = requireAppOrigin(deps);
  const salted = requireSaltSignature(deps);

  const applyAuth = (c: Context<AppEnv>, auth: service.IssuedAuth) => {
    if (auth.cookie)
      setRefreshCookie(c, auth.cookie.token, auth.cookie.remember, deps.env);
    return auth.response;
  };

  router.openapi(
    createRoute({
      method: 'post',
      path: '/auth/register',
      operationId: 'register',
      tags,
      summary: 'Регистрация',
      description: 'Создаёт аккаунт и сразу открывает сессию на 30 дней.',
      security: noAuth,
      middleware: [salted],
      request: {
        headers: saltHeadersSchema,
        body: jsonBody(registerBodySchema),
      },
      responses: {
        201: {
          ...jsonResponse(authResponseSchema, 'Аккаунт создан'),
          headers: setsRefreshCookie,
        },
        ...errors({
          400: ['BAD_REQUEST'],
          403: ['SALT_INVALID'],
          409: ['EMAIL_TAKEN'],
          422: ['VALIDATION_ERROR'],
        }),
      },
    }),
    async (c) => {
      const auth = await service.register(
        deps,
        c.req.valid('json'),
        c.req.header('User-Agent') ?? null,
      );
      return c.json(applyAuth(c, auth), 201);
    },
  );

  router.openapi(
    createRoute({
      method: 'post',
      path: '/auth/login',
      operationId: 'login',
      tags,
      summary: 'Вход по email и паролю',
      description:
        'Для неизвестного email и аккаунта без пароля ответ такой же, как для неверного пароля. ' +
        'После 10 неудач на email за 15 минут вход блокируется, в ответе 429 есть заголовок `Retry-After`.',
      security: noAuth,
      middleware: [salted],
      request: { headers: saltHeadersSchema, body: jsonBody(loginBodySchema) },
      responses: {
        200: {
          ...jsonResponse(authResponseSchema, 'Вход выполнен'),
          headers: setsRefreshCookie,
        },
        ...errors({
          400: ['BAD_REQUEST'],
          401: ['INVALID_CREDENTIALS'],
          403: ['SALT_INVALID'],
          422: ['VALIDATION_ERROR'],
          429: ['TOO_MANY_ATTEMPTS'],
        }),
      },
    }),
    async (c) => {
      const auth = await service.login(
        deps,
        c.req.valid('json'),
        c.req.header('User-Agent') ?? null,
      );
      return c.json(applyAuth(c, auth), 200);
    },
  );

  router.openapi(
    createRoute({
      method: 'post',
      path: '/auth/refresh',
      operationId: 'refreshSession',
      tags,
      summary: 'Новый access-токен по cookie',
      description:
        'Вызывается при запуске приложения и когда истёк access. Токен в cookie одноразовый: при успехе приходит новая cookie. ' +
        'Параллельный запрос из соседней вкладки в течение 30 секунд получает 200 с новым access и `Set-Cookie` с актуальным refresh-токеном. ' +
        'Повтор старой cookie позже 30 секунд считается кражей: сессия отзывается целиком.',
      security: refreshCookie,
      middleware: [sameOrigin],
      responses: {
        200: {
          ...jsonResponse(authResponseSchema, 'Новый access-токен'),
          headers: setsRefreshCookie,
        },
        ...errors({
          401: [
            'REFRESH_MISSING',
            'REFRESH_INVALID',
            'REFRESH_EXPIRED',
            'REFRESH_REUSED',
          ],
          403: ['FORBIDDEN_ORIGIN'],
        }),
      },
    }),
    async (c) => {
      const result = await service.refresh(deps, readRefreshCookie(c));
      if ('reused' in result) {
        clearRefreshCookie(c, deps.env);
        throw new AppError('REFRESH_REUSED');
      }
      return c.json(applyAuth(c, result), 200);
    },
  );

  router.openapi(
    createRoute({
      method: 'post',
      path: '/auth/logout',
      operationId: 'logout',
      tags,
      summary: 'Выход',
      description:
        'Всегда 204 при верном `Origin`, даже без cookie. Cookie очищается.',
      security: refreshCookie,
      middleware: [sameOrigin],
      responses: {
        204: { description: 'Сессия завершена' },
        ...errors({ 403: ['FORBIDDEN_ORIGIN'] }),
      },
    }),
    async (c) => {
      await service.logout(deps, readRefreshCookie(c));
      clearRefreshCookie(c, deps.env);
      return c.body(null, 204);
    },
  );

  for (const client of OAUTH_CLIENTS) registerOAuthRoutes(router, deps, client);

  return router;
}
