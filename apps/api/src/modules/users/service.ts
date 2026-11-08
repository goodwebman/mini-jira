import type { UserSearchResponse } from '@gwmt/contracts';
import type { AppDeps } from '../../lib/context.js';
import { AppError } from '../../lib/errors.js';
import { findMemberRole } from '../boards/repo.js';
import * as repo from './repo.js';

export async function searchUsers(
  deps: AppDeps,
  userId: string,
  query: { q?: string | undefined; excludeBoardId?: number | undefined },
): Promise<UserSearchResponse> {
  const { excludeBoardId } = query;
  if (excludeBoardId !== undefined) {
    const role = await findMemberRole(deps.db, excludeBoardId, userId);
    if (role !== 'admin') throw new AppError('ROLE_FORBIDDEN');
  }
  return {
    items: await repo.searchUsers(deps.db, userId, { q: query.q ?? '', excludeBoardId }),
  };
}
