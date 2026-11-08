import { createMiddleware } from 'hono/factory';
import type { AppDeps, AppEnv } from '../../lib/context.js';
import { AppError } from '../../lib/errors.js';
import { verifyAccessToken } from '../../lib/jwt.js';
import { peekJsonObject } from '../../lib/request.js';
import { isValidSaltSignature } from '../../lib/salt.js';

const PUBLIC_PATHS = ['/api/v1/health', '/api/v1/openapi.json', '/api/v1/docs'];
const PUBLIC_PREFIX = '/api/v1/auth/';

export const requireAuth = (deps: AppDeps) =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (PUBLIC_PATHS.includes(c.req.path) || c.req.path.startsWith(PUBLIC_PREFIX)) {
      return next();
    }

    const header = c.req.header('Authorization');
    if (!header) throw new AppError('ACCESS_TOKEN_MISSING');
    if (!header.startsWith('Bearer ')) throw new AppError('ACCESS_TOKEN_INVALID');

    const claims = await verifyAccessToken(
      header.slice('Bearer '.length),
      deps.env.JWT_ACCESS_SECRET,
      deps.now(),
    );
    c.set('userId', claims.userId);
    c.set('sessionId', claims.sessionId);
    return next();
  });

/**
 * Подпись клиента на входе и регистрации: fastify-token = SHA256(salt + email + timestamp).
 * Стоит раньше валидатора и scrypt, поэтому запрос без подписи не тратит дорогое хэширование.
 * Email берётся из сырого тела: клиент подписывает значение как есть, до trim.
 */
export const requireSaltSignature = (deps: AppDeps) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const version = c.req.header('fastify-version');
    const token = c.req.header('fastify-token');
    const timestamp = c.req.header('fastify-timestamp');
    if (!version || !token || !timestamp) throw new AppError('SALT_INVALID');

    const body = await peekJsonObject(c);
    if (!body) return next();

    const valid = isValidSaltSignature({
      version,
      token,
      timestamp,
      identifier: typeof body.email === 'string' ? body.email : '',
      secret: deps.env.SALT_SECRET,
      now: deps.now(),
    });
    if (!valid) throw new AppError('SALT_INVALID');
    return next();
  });

/** Ручки с cookie: чужой Origin отклоняется, отсутствие заголовка допустимо. */
export const requireAppOrigin = (deps: AppDeps) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const origin = c.req.header('Origin');
    if (origin && origin !== deps.env.APP_URL) throw new AppError('FORBIDDEN_ORIGIN');
    return next();
  });
