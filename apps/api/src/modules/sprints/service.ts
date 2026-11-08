import type { SprintBrief } from '@gwmt/contracts';
import type { Db } from '../../db/client.js';
import type { SprintRow } from '../../db/schema.js';
import type { AppDeps } from '../../lib/context.js';
import { AppError } from '../../lib/errors.js';
import {
  addDays,
  dateInZone,
  diffDays,
  mondayOf,
  nextMondayAfterSprint,
  SPRINT_LENGTH_DAYS,
  sprintEndDate,
  startOfDayInZone,
} from '../../lib/workdays.js';
import { computeForSprint } from '../kpi/service.js';
import * as repo from './repo.js';

export const toSprintBrief = (sprint: SprintRow): SprintBrief => ({
  id: sprint.id,
  number: sprint.number,
  state: sprint.state,
  startDate: sprint.startDate,
  endDate: sprint.endDate,
});

export function createFirstSprint(tx: Db, boardId: number, timezone: string, now: Date) {
  const startDate = mondayOf(dateInZone(now, timezone));
  return repo.insertSprint(tx, {
    boardId,
    number: 1,
    startDate,
    endDate: sprintEndDate(startDate),
    state: 'active',
    createdAt: now,
  });
}

const isSprintOver = (endDate: string, timezone: string, now: Date) =>
  now >= startOfDayInZone(nextMondayAfterSprint(endDate), timezone);

async function rollOver(tx: Db, boardId: number, timezone: string, now: Date): Promise<SprintRow> {
  const current = await repo.lockActiveSprint(tx, boardId);

  // Пока ждали блокировку, спринт закрыл другой запрос: остаётся вернуть новый.
  if (!current || !isSprintOver(current.endDate, timezone, now)) {
    const active = await repo.findActiveSprint(tx, boardId);
    if (!active) throw new AppError('BOARD_NOT_FOUND');
    return active;
  }

  await repo.closeSprint(tx, current.id, await computeForSprint(tx, current, timezone, now, true));

  const today = dateInZone(now, timezone);
  const periods = Math.floor(diffDays(today, current.startDate) / SPRINT_LENGTH_DAYS);
  const startDate = addDays(current.startDate, periods * SPRINT_LENGTH_DAYS);

  const next = await repo.insertSprint(tx, {
    boardId,
    number: current.number + 1,
    startDate,
    endDate: sprintEndDate(startDate),
    state: 'active',
    createdAt: now,
  });
  await repo.moveOpenTasks(tx, current.id, next.id, startOfDayInZone(startDate, timezone));
  return next;
}

export async function ensureActiveSprint(deps: AppDeps, boardId: number): Promise<SprintRow> {
  const now = deps.now();
  const current = await repo.findActiveSprintWithTimezone(deps.db, boardId);
  if (!current) throw new AppError('BOARD_NOT_FOUND');
  if (!isSprintOver(current.sprint.endDate, current.timezone, now)) return current.sprint;
  return deps.withTx((tx) => rollOver(tx, boardId, current.timezone, now));
}
