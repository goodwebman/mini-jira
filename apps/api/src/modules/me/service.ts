import type { ChangePasswordBody, Me, UpdateMeBody } from '@gwmt/contracts';
import type { AppDeps } from '../../lib/context.js';
import { AppError } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import * as authRepo from '../auth/repo.js';
import { toMe } from '../auth/service.js';
import * as repo from './repo.js';

async function requireUser(deps: AppDeps, userId: string) {
  const user = await authRepo.findUserById(deps.db, userId);
  if (!user) throw new AppError('ACCESS_TOKEN_INVALID');
  return user;
}

export async function getMe(deps: AppDeps, userId: string): Promise<Me> {
  return toMe(await requireUser(deps, userId));
}

const emailTaken = () =>
  new AppError('EMAIL_TAKEN', { fields: { email: 'Этот email уже зарегистрирован' } });

export async function updateMe(deps: AppDeps, userId: string, body: UpdateMeBody): Promise<Me> {
  const user = await requireUser(deps, userId);
  if (Object.values(body).every((value) => value === undefined)) return toMe(user);

  if (body.email !== undefined) {
    const owner = await authRepo.findUserByEmail(deps.db, body.email);
    if (owner && owner.id !== userId) throw emailTaken();
  }

  try {
    const updated = await repo.updateUser(deps.db, userId, { ...body, updatedAt: deps.now() });
    if (!updated) throw new AppError('ACCESS_TOKEN_INVALID');
    return toMe(updated);
  } catch (err) {
    // Гонка двух запросов: проверка выше прошла, но уникальный индекс сработал.
    if (isUniqueViolation(err)) throw emailTaken();
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  const source = err instanceof Error && err.cause ? err.cause : err;
  return (source as { code?: string } | null)?.code === '23505';
}

export async function changePassword(
  deps: AppDeps,
  userId: string,
  sessionId: string,
  body: ChangePasswordBody,
): Promise<void> {
  const user = await requireUser(deps, userId);

  if (user.passwordHash) {
    const matches =
      body.currentPassword !== undefined &&
      (await verifyPassword(body.currentPassword, user.passwordHash));
    if (!matches) {
      throw new AppError('WRONG_PASSWORD', { fields: { currentPassword: 'Неверный пароль' } });
    }
  }

  const passwordHash = await hashPassword(body.newPassword);
  const now = deps.now();
  await deps.withTx(async (tx) => {
    await repo.setPasswordHash(tx, userId, passwordHash, now);
    await authRepo.revokeUserSessions(tx, userId, now, sessionId);
  });
}
