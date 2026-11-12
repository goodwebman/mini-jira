import type { MyTaskStats, NavSummary } from '@gwmt/contracts';

import type { AppDeps } from '../../lib/context.js';
import { AppError } from '../../lib/errors.js';
import * as boardsRepo from '../boards/repo.js';
import { computeForSprint } from '../kpi/service.js';
import * as sprintsRepo from '../sprints/repo.js';
import { ensureActiveSprint } from '../sprints/service.js';
import * as tasksRepo from '../tasks/repo.js';

const NAV_NEXT_LIMIT = 3;
const STATS_NEXT_LIMIT = 4;

export async function getNavSummary(
  deps: AppDeps,
  userId: string,
  requestedBoardId: number | undefined,
): Promise<NavSummary> {
  if (
    requestedBoardId !== undefined &&
    !(await boardsRepo.findMemberRole(deps.db, requestedBoardId, userId))
  ) {
    throw new AppError('BOARD_NOT_FOUND');
  }
  const boardId =
    requestedBoardId ?? (await tasksRepo.findLatestBoardId(deps.db, userId));

  const [boardsTotal, counts, next] = await Promise.all([
    tasksRepo.countBoards(deps.db, userId),
    tasksRepo.countMyTasks(deps.db, userId, {}),
    tasksRepo.listMyOpenTasks(deps.db, userId, NAV_NEXT_LIMIT),
  ]);
  const myTasks = {
    openCount: counts.openCount,
    openSp: counts.openSpTenths / 10,
    next: next.map((task) => ({ key: task.key, title: task.title })),
  };

  if (boardId === null) return { boardsTotal, board: null, myTasks, kpi: null };

  const sprint = await ensureActiveSprint(deps, boardId);
  const board = await boardsRepo.findBoard(deps.db, boardId);
  if (!board) throw new AppError('BOARD_NOT_FOUND');

  const [statusCounts, kpi] = await Promise.all([
    sprintsRepo.countTasksByStatus(deps.db, sprint.id),
    computeForSprint(deps.db, sprint, board.timezone, deps.now(), false),
  ]);

  return {
    boardsTotal,
    board: {
      id: board.id,
      name: board.name,
      sprintNumber: sprint.number,
      statusCounts,
    },
    myTasks,
    kpi: {
      sprintNumber: sprint.number,
      donePct: kpi.summary.donePct,
      remaining: kpi.days
        .filter((day) => day.isPast)
        .map((day) => day.remainingSp ?? 0),
    },
  };
}

export async function getTaskStats(
  deps: AppDeps,
  userId: string,
): Promise<MyTaskStats> {
  const [counts, next] = await Promise.all([
    tasksRepo.countMyTasks(deps.db, userId, {}),
    tasksRepo.listMyOpenTasks(deps.db, userId, STATS_NEXT_LIMIT),
  ]);
  return {
    open: counts.openCount,
    closed: counts.count - counts.openCount,
    totalSp: counts.spTenths / 10,
    nextOpen: next.map((task) => ({
      key: task.key,
      title: task.title,
      priority: task.priority,
    })),
  };
}
