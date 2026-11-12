import type {
  AuthResponse,
  LoginBody,
  Me,
  RegisterBody,
} from '@gwmt/contracts';
import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';

import type { Db } from '../../db/client.js';
import type { UserRow } from '../../db/schema.js';
import type { AppDeps } from '../../lib/context.js';
import { AppError } from '../../lib/errors.js';
import { signAccessToken } from '../../lib/jwt.js';
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
} from '../../lib/password.js';
import { OAuthFlowError, type OAuthIdentity } from './oauth.js';
import * as repo from './repo.js';

const DAY_MS = 86_400_000;
const REMEMBER_TTL_MS = 30 * DAY_MS;
const SHORT_TTL_MS = DAY_MS;
const REFRESH_GRACE_MS = 30_000;

const THROTTLE_MAX_FAILS = 10;
const THROTTLE_WINDOW_MS = 15 * 60_000;

const COLOR_COUNT = 6;

const sessionTtl = (remember: boolean) =>
  remember ? REMEMBER_TTL_MS : SHORT_TTL_MS;
const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const newRefreshToken = () => randomBytes(32).toString('base64url');

export function toMe(user: UserRow): Me {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    job: user.job,
    timezone: user.timezone,
    colorIndex: user.colorIndex,
    hasPassword: user.passwordHash !== null,
    hasGithub: user.githubId !== null,
    hasGoogle: user.googleId !== null,
  };
}

async function startSession(
  tx: Db,
  userId: string,
  remember: boolean,
  userAgent: null | string,
  now: Date,
) {
  const session = await repo.insertSession(tx, {
    userId,
    remember,
    userAgent,
    expiresAt: new Date(now.getTime() + sessionTtl(remember)),
    lastUsedAt: now,
    createdAt: now,
  });
  const refreshToken = newRefreshToken();
  await repo.insertRefreshToken(tx, session.id, sha256(refreshToken), now);
  return { sessionId: session.id, refreshToken };
}

async function authResponse(
  deps: AppDeps,
  user: UserRow,
  sessionId: string,
): Promise<AuthResponse> {
  const token = await signAccessToken(
    { userId: user.id, sessionId },
    deps.env.JWT_ACCESS_SECRET,
    deps.now(),
  );
  return { ...token, user: toMe(user) };
}

export interface IssuedAuth {
  response: AuthResponse;
  cookie?: { token: string; remember: boolean };
}

export async function register(
  deps: AppDeps,
  body: RegisterBody,
  userAgent: null | string,
): Promise<IssuedAuth> {
  const passwordHash = await hashPassword(body.password);
  const now = deps.now();

  const created = await deps.withTx(async (tx) => {
    const user = await repo.insertUser(tx, {
      email: body.email,
      name: body.name,
      passwordHash,
      colorIndex: randomInt(COLOR_COUNT),
      termsAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    if (!user) return null;
    return {
      user,
      session: await startSession(tx, user.id, true, userAgent, now),
    };
  });

  if (!created) {
    throw new AppError('EMAIL_TAKEN', {
      fields: { email: 'Этот email уже зарегистрирован' },
    });
  }
  return {
    response: await authResponse(deps, created.user, created.session.sessionId),
    cookie: { token: created.session.refreshToken, remember: true },
  };
}

async function assertNotThrottled(db: Db, key: string, now: Date) {
  const throttle = await repo.findThrottle(db, key);
  if (!throttle?.lockedUntil || throttle.lockedUntil <= now) return;
  const retryAfter = Math.ceil(
    (throttle.lockedUntil.getTime() - now.getTime()) / 1000,
  );
  throw new AppError('TOO_MANY_ATTEMPTS', {
    headers: { 'Retry-After': String(retryAfter) },
  });
}

export async function login(
  deps: AppDeps,
  body: LoginBody,
  userAgent: null | string,
): Promise<IssuedAuth> {
  const now = deps.now();
  const throttleKey = `login:${body.email.toLowerCase()}`;
  await assertNotThrottled(deps.db, throttleKey, now);

  const user = await repo.findUserByEmail(deps.db, body.email);
  // Хэш проверяется всегда, иначе по времени ответа видно, есть ли такой email.
  const matches = await verifyPassword(
    body.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user?.passwordHash || !matches) {
    await repo.recordLoginFailure(
      deps.db,
      throttleKey,
      now,
      new Date(now.getTime() - THROTTLE_WINDOW_MS),
      THROTTLE_MAX_FAILS,
      new Date(now.getTime() + THROTTLE_WINDOW_MS),
    );
    throw new AppError('INVALID_CREDENTIALS');
  }

  await repo.clearThrottle(deps.db, throttleKey);
  const session = await deps.withTx((tx) =>
    startSession(tx, user.id, body.remember, userAgent, now),
  );
  return {
    response: await authResponse(deps, user, session.sessionId),
    cookie: { token: session.refreshToken, remember: body.remember },
  };
}

type RefreshOutcome =
  | { kind: 'concurrent'; token: string }
  | { kind: 'reused' }
  | { kind: 'rotated'; token: string };

export type RefreshResult = IssuedAuth | { reused: true };

export async function refresh(
  deps: AppDeps,
  token: string | undefined,
): Promise<RefreshResult> {
  if (!token) throw new AppError('REFRESH_MISSING');

  const now = deps.now();
  const found = await repo.findRefreshToken(deps.db, sha256(token));
  if (!found) throw new AppError('REFRESH_INVALID');
  if (found.revokedAt || found.expiresAt <= now)
    throw new AppError('REFRESH_EXPIRED');

  // Reproduce successors without storing plaintext refresh tokens in the database.
  const successor = (previous: string) =>
    createHmac('sha256', deps.env.JWT_ACCESS_SECRET)
      .update(`refresh:${previous}`)
      .digest('base64url');

  // Отзыв сессии при краже должен закоммититься, поэтому ошибку бросаем уже после транзакции.
  const outcome = await deps.withTx<RefreshOutcome>(async (tx) => {
    if (await repo.markRefreshTokenUsed(tx, found.id, now)) {
      const nextToken = successor(token);
      await repo.insertRefreshToken(
        tx,
        found.sessionId,
        sha256(nextToken),
        now,
      );
      await repo.extendSession(
        tx,
        found.sessionId,
        new Date(now.getTime() + sessionTtl(found.remember)),
        now,
      );
      return { kind: 'rotated', token: nextToken };
    }

    const usedAt = await repo.getRefreshTokenUsedAt(tx, found.id);
    if (usedAt && now.getTime() - usedAt.getTime() <= REFRESH_GRACE_MS) {
      let current = successor(token);
      let row = await repo.findRefreshToken(tx, sha256(current));
      // Follow any further rotations so a delayed response restores the latest cookie.
      while (row?.usedAt) {
        current = successor(current);
        row = await repo.findRefreshToken(tx, sha256(current));
      }
      if (row) return { kind: 'concurrent', token: current };
      // Tokens rotated before this deployment cannot be reconstructed.
      throw new AppError('REFRESH_INVALID');
    }
    await repo.revokeSession(tx, found.sessionId, now);
    return { kind: 'reused' };
  });

  if (outcome.kind === 'reused') return { reused: true };

  const user = await repo.findUserById(deps.db, found.userId);
  if (!user) throw new AppError('REFRESH_INVALID');
  const response = await authResponse(deps, user, found.sessionId);
  return {
    response,
    cookie: { token: outcome.token, remember: found.remember },
  };
}

export async function logout(
  deps: AppDeps,
  token: string | undefined,
): Promise<void> {
  if (!token) return;
  const found = await repo.findRefreshToken(deps.db, sha256(token));
  if (found) await repo.revokeSession(deps.db, found.sessionId, deps.now());
}

const providerColumns = (identity: OAuthIdentity) =>
  identity.provider === 'github'
    ? { githubId: identity.id }
    : { googleId: identity.id };

/** Вход через внешнего провайдера. Куки и редирект остаются на стороне маршрута. */
export async function loginWithOAuth(
  deps: AppDeps,
  identity: OAuthIdentity,
  userAgent: null | string,
): Promise<{ refreshToken: string }> {
  const now = deps.now();
  const session = await deps.withTx(async (tx) => {
    let user =
      identity.provider === 'github'
        ? await repo.findUserByGithubId(tx, identity.id)
        : await repo.findUserByGoogleId(tx, identity.id);

    if (!user) {
      const existing = await repo.findUserByEmail(tx, identity.email);
      if (existing) {
        // Адрес мог сменить владельца, а привязка ниже обнуляет пароль: это был бы угон аккаунта.
        if (identity.provider === 'google' && !identity.emailAuthoritative) {
          throw new OAuthFlowError('email_not_trusted');
        }
        // Email при регистрации не подтверждается: пароль мог задать злоумышленник,
        // заранее занявший чужой адрес. Поэтому пароль и его сессии сгорают.
        if (existing.passwordHash)
          await repo.revokeUserSessions(tx, existing.id, now);
        user = await repo.linkOAuthAccount(
          tx,
          existing.id,
          providerColumns(identity),
          now,
        );
      } else {
        user = await repo.insertUser(tx, {
          email: identity.email,
          name: identity.name,
          ...providerColumns(identity),
          colorIndex: randomInt(COLOR_COUNT),
          termsAcceptedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    if (!user) throw new Error('oauth user was not resolved');
    return startSession(tx, user.id, true, userAgent, now);
  });
  return { refreshToken: session.refreshToken };
}
