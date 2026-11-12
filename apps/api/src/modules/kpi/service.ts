import type { SprintKpi, SprintListItem } from '@gwmt/contracts';
import { eq, inArray } from 'drizzle-orm';

import type { Db } from '../../db/client.js';
import { type SprintRow, boards, users } from '../../db/schema.js';
import type { AppDeps } from '../../lib/context.js';
import { AppError } from '../../lib/errors.js';
import * as sprintsRepo from '../sprints/repo.js';
import { type SprintKpiSnapshot, computeSprintKpi } from './compute.js';

const PREVIOUS_VELOCITY_LIMIT = 5;

export async function computeForSprint(
  db: Db,
  sprint: SprintRow,
  timezone: string,
  now: Date,
  isClosed: boolean,
): Promise<SprintKpiSnapshot> {
  const [tasks, memberIds, previousSprints] = await Promise.all([
    sprintsRepo.loadKpiTasks(db, sprint.id),
    sprintsRepo.listNonGuestMemberIds(db, sprint.boardId),
    sprintsRepo.listPreviousVelocity(
      db,
      sprint.boardId,
      sprint.number,
      PREVIOUS_VELOCITY_LIMIT,
    ),
  ]);
  return computeSprintKpi({
    now,
    timezone,
    number: sprint.number,
    startDate: sprint.startDate,
    isClosed,
    tasks,
    memberIds,
    previousSprints,
  });
}

export async function getSprintKpi(
  deps: AppDeps,
  boardId: number,
  number: number,
): Promise<SprintKpi> {
  const sprint = await sprintsRepo.findSprintByNumber(deps.db, boardId, number);
  if (!sprint) throw new AppError('SPRINT_NOT_FOUND');

  const [board] = await deps.db
    .select({
      id: boards.id,
      key: boards.key,
      name: boards.name,
      colorIndex: boards.colorIndex,
      timezone: boards.timezone,
    })
    .from(boards)
    .where(eq(boards.id, boardId));
  if (!board) throw new AppError('BOARD_NOT_FOUND');

  const now = deps.now();
  const snapshot =
    sprint.state === 'closed' && sprint.kpiSnapshot
      ? sprint.kpiSnapshot
      : await computeForSprint(deps.db, sprint, board.timezone, now, false);

  const userIds = snapshot.team.map((entry) => entry.userId);
  const people =
    userIds.length === 0
      ? []
      : await deps.db
          .select({
            id: users.id,
            name: users.name,
            job: users.job,
            colorIndex: users.colorIndex,
          })
          .from(users)
          .where(inArray(users.id, userIds));
  const peopleById = new Map(people.map((person) => [person.id, person]));

  const { todayIndex, team, ...rest } = snapshot;
  return {
    ...rest,
    serverTime: now.toISOString(),
    board: {
      id: board.id,
      key: board.key,
      name: board.name,
      colorIndex: board.colorIndex,
    },
    sprint: {
      id: sprint.id,
      number: sprint.number,
      state: sprint.state,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      todayIndex,
      dayNumber: todayIndex + 1,
      totalDays: 10,
    },
    team: team.flatMap(({ userId, ...numbers }) => {
      const user = peopleById.get(userId);
      return user ? [{ user, ...numbers }] : [];
    }),
  };
}

export async function listBoardSprints(
  deps: AppDeps,
  boardId: number,
  limit: number,
): Promise<SprintListItem[]> {
  const rows = await sprintsRepo.listSprints(deps.db, boardId, limit);
  const now = deps.now();

  const [board] = await deps.db
    .select({ timezone: boards.timezone })
    .from(boards)
    .where(eq(boards.id, boardId));
  if (!board) throw new AppError('BOARD_NOT_FOUND');

  return Promise.all(
    rows.map(async (sprint) => {
      const summary =
        sprint.state === 'closed' && sprint.kpiSnapshot
          ? sprint.kpiSnapshot.summary
          : (
              await computeForSprint(
                deps.db,
                sprint,
                board.timezone,
                now,
                false,
              )
            ).summary;
      return {
        id: sprint.id,
        number: sprint.number,
        state: sprint.state,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        doneSp: summary.doneSp,
        scopeSp: summary.scopeSp,
      };
    }),
  );
}
