import type {
  AddMemberBody,
  BoardDetail,
  BoardListResponse,
  BoardMember,
  CreateBoardBody,
  UpdateMemberBody,
  UserBrief,
} from '@gwmt/contracts';

import type { AppDeps } from '../../lib/context.js';
import { AppError } from '../../lib/errors.js';
import * as authRepo from '../auth/repo.js';
import * as sprintsRepo from '../sprints/repo.js';
import { createFirstSprint, toSprintBrief } from '../sprints/service.js';
import * as repo from './repo.js';

const COLOR_COUNT = 6;
const MEMBERS_PREVIEW_LIMIT = 4;

const toBoardMember = (
  row: NonNullable<Awaited<ReturnType<typeof repo.findBoardMember>>>,
): BoardMember => ({
  id: row.id,
  name: row.name,
  job: row.job,
  colorIndex: row.colorIndex,
  email: row.email,
  role: row.role,
  addedAt: row.addedAt.toISOString(),
});

export async function listBoards(
  deps: AppDeps,
  userId: string,
  query: { q?: string | undefined; filter?: 'all' | 'favorite' | undefined },
): Promise<BoardListResponse> {
  const rows = await repo.listBoardsForUser(deps.db, userId, {
    q: query.q,
    favoriteOnly: query.filter === 'favorite',
  });
  const members = await repo.listMembersOfBoards(
    deps.db,
    rows.map((row) => row.id),
  );

  const previews = new Map<number, UserBrief[]>();
  for (const { boardId, ...user } of members) {
    const list = previews.get(boardId) ?? [];
    if (list.length < MEMBERS_PREVIEW_LIMIT) list.push(user);
    previews.set(boardId, list);
  }

  return {
    items: rows.map((row) => ({
      ...row,
      membersPreview: previews.get(row.id) ?? [],
    })),
    total: rows.length,
  };
}

export async function getBoardDetail(
  deps: AppDeps,
  boardId: number,
  userId: string,
): Promise<BoardDetail> {
  const [board, members, favorite, sprint] = await Promise.all([
    repo.findBoard(deps.db, boardId),
    repo.listBoardMembers(deps.db, boardId),
    repo.isFavorite(deps.db, boardId, userId),
    sprintsRepo.findActiveSprint(deps.db, boardId),
  ]);
  const me = members.find((member) => member.id === userId);
  if (!board || !sprint || !me) throw new AppError('BOARD_NOT_FOUND');

  return {
    id: board.id,
    key: board.key,
    name: board.name,
    description: board.description,
    colorIndex: board.colorIndex,
    timezone: board.timezone,
    isFavorite: favorite,
    myRole: me.role,
    members: members.map(toBoardMember),
    currentSprint: toSprintBrief(sprint),
  };
}

export async function createBoard(
  deps: AppDeps,
  userId: string,
  body: CreateBoardBody,
): Promise<BoardDetail> {
  const creator = await authRepo.findUserById(deps.db, userId);
  if (!creator) throw new AppError('ACCESS_TOKEN_INVALID');

  const now = deps.now();
  const memberIds = [...new Set(body.memberIds)].filter((id) => id !== userId);

  const boardId = await deps.withTx(async (tx) => {
    if (memberIds.length > 0) {
      const existing = await repo.listExistingUserIds(tx, memberIds);
      if (existing.length !== memberIds.length)
        throw new AppError('USER_NOT_FOUND');
    }

    const board = await repo.insertBoard(tx, {
      key: body.key,
      name: body.name,
      description: body.description ?? '',
      colorIndex: 0,
      timezone: creator.timezone,
      createdBy: userId,
      createdAt: now,
    });
    if (!board) {
      throw new AppError('BOARD_KEY_TAKEN', {
        fields: { key: 'Такой ключ уже есть' },
      });
    }

    await repo.setBoardColor(tx, board.id, board.id % COLOR_COUNT);
    await repo.insertMembers(tx, [
      {
        boardId: board.id,
        userId,
        role: 'admin',
        addedAt: now,
        addedBy: userId,
      },
      ...memberIds.map((id) => ({
        boardId: board.id,
        userId: id,
        role: 'worker' as const,
        addedAt: now,
        addedBy: userId,
      })),
    ]);
    await createFirstSprint(tx, board.id, creator.timezone, now);
    return board.id;
  });

  return getBoardDetail(deps, boardId, userId);
}

export async function addMember(
  deps: AppDeps,
  boardId: number,
  actorId: string,
  body: AddMemberBody,
): Promise<BoardMember> {
  const target = await authRepo.findUserById(deps.db, body.userId);
  if (!target) throw new AppError('USER_NOT_FOUND');

  const inserted = await repo.insertMember(deps.db, {
    boardId,
    userId: body.userId,
    role: body.role ?? 'worker',
    addedAt: deps.now(),
    addedBy: actorId,
  });
  if (!inserted) throw new AppError('ALREADY_MEMBER');

  const member = await repo.findBoardMember(deps.db, boardId, body.userId);
  if (!member) throw new AppError('USER_NOT_FOUND');
  return toBoardMember(member);
}

export async function updateMember(
  deps: AppDeps,
  boardId: number,
  actorId: string,
  userId: string,
  body: UpdateMemberBody,
): Promise<BoardMember> {
  if (actorId === userId) throw new AppError('CANNOT_CHANGE_OWN_ROLE');
  if (!(await repo.updateMemberRole(deps.db, boardId, userId, body.role))) {
    throw new AppError('USER_NOT_FOUND');
  }
  const member = await repo.findBoardMember(deps.db, boardId, userId);
  if (!member) throw new AppError('USER_NOT_FOUND');
  return toBoardMember(member);
}

export async function removeMember(
  deps: AppDeps,
  boardId: number,
  actorId: string,
  userId: string,
): Promise<void> {
  if (actorId === userId) throw new AppError('CANNOT_REMOVE_SELF');
  if (!(await repo.deleteMember(deps.db, boardId, userId)))
    throw new AppError('USER_NOT_FOUND');
}
