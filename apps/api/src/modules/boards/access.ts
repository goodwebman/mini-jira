import { boardIdParamSchema, can, taskKeyParamSchema, type BoardAction } from '@gwmt/contracts';
import { createMiddleware } from 'hono/factory';
import type { AppDeps, AppEnv } from '../../lib/context.js';
import { AppError } from '../../lib/errors.js';
import { ensureActiveSprint } from '../sprints/service.js';
import * as repo from './repo.js';

// Эти проверки стоят раньше валидатора тела: порядок контракта 401, 404, 403, 422, 409.

export const requireBoardMember = (deps: AppDeps) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const parsed = boardIdParamSchema.safeParse({ boardId: c.req.param('boardId') });
    if (!parsed.success) throw new AppError('BAD_REQUEST');

    const { boardId } = parsed.data;
    const role = await repo.findMemberRole(deps.db, boardId, c.get('userId'));
    if (!role) throw new AppError('BOARD_NOT_FOUND');

    await ensureActiveSprint(deps, boardId);
    c.set('boardId', boardId);
    c.set('boardRole', role);
    return next();
  });

export const requireTaskAccess = (deps: AppDeps) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const parsed = taskKeyParamSchema.safeParse({ key: c.req.param('key') });
    if (!parsed.success) throw new AppError('BAD_REQUEST');

    const access = await repo.findTaskAccess(deps.db, parsed.data.key, c.get('userId'));
    if (!access) throw new AppError('TASK_NOT_FOUND');

    c.set('task', { id: access.id, key: access.key, boardId: access.boardId });
    c.set('boardId', access.boardId);
    c.set('boardRole', access.role);
    return next();
  });

export const requireAction = (action: BoardAction) =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (!can(c.get('boardRole'), action)) throw new AppError('ROLE_FORBIDDEN');
    return next();
  });
