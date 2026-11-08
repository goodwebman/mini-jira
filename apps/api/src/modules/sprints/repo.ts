import type { TaskStatus } from '@gwmt/contracts';
import { and, asc, desc, eq, inArray, lt, ne, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import {
  boardMembers,
  boards,
  sprints,
  sprintTasks,
  tasks,
  taskStatusIntervals,
  type SprintRow,
} from '../../db/schema.js';
import type { KpiTask, SprintKpiSnapshot, VelocityItem } from '../kpi/compute.js';

export async function findActiveSprintWithTimezone(db: Db, boardId: number) {
  const [row] = await db
    .select({ sprint: sprints, timezone: boards.timezone })
    .from(sprints)
    .innerJoin(boards, eq(boards.id, sprints.boardId))
    .where(and(eq(sprints.boardId, boardId), eq(sprints.state, 'active')));
  return row ?? null;
}

export async function findActiveSprint(db: Db, boardId: number): Promise<SprintRow | null> {
  const [row] = await db
    .select()
    .from(sprints)
    .where(and(eq(sprints.boardId, boardId), eq(sprints.state, 'active')));
  return row ?? null;
}

/** Параллельный запрос ждёт здесь и после коммита первого уже не увидит закрытую строку. */
export async function lockActiveSprint(db: Db, boardId: number): Promise<SprintRow | null> {
  const [row] = await db
    .select()
    .from(sprints)
    .where(and(eq(sprints.boardId, boardId), eq(sprints.state, 'active')))
    .for('update');
  return row ?? null;
}

export async function findSprintByNumber(db: Db, boardId: number, number: number) {
  const [row] = await db
    .select()
    .from(sprints)
    .where(and(eq(sprints.boardId, boardId), eq(sprints.number, number)));
  return row ?? null;
}

export async function listSprints(db: Db, boardId: number, limit: number) {
  return db
    .select()
    .from(sprints)
    .where(eq(sprints.boardId, boardId))
    .orderBy(desc(sprints.number))
    .limit(limit);
}

export async function insertSprint(db: Db, values: typeof sprints.$inferInsert) {
  const [sprint] = await db.insert(sprints).values(values).returning();
  if (!sprint) throw new Error('sprint was not created');
  return sprint;
}

export async function closeSprint(
  db: Db,
  sprintId: string,
  snapshot: SprintKpiSnapshot,
): Promise<void> {
  await db
    .update(sprints)
    .set({
      state: 'closed',
      plannedSp: snapshot.summary.committedSp,
      doneSp: snapshot.summary.doneSp,
      kpiSnapshot: snapshot,
    })
    .where(eq(sprints.id, sprintId));
}

export async function moveOpenTasks(
  db: Db,
  fromSprintId: string,
  toSprintId: string,
  addedAt: Date,
): Promise<void> {
  const moved = await db
    .update(tasks)
    .set({ sprintId: toSprintId })
    .where(and(eq(tasks.sprintId, fromSprintId), ne(tasks.status, 'done')))
    .returning({ id: tasks.id });
  if (moved.length === 0) return;
  await db
    .insert(sprintTasks)
    .values(moved.map(({ id }) => ({ sprintId: toSprintId, taskId: id, addedAt })));
}

export async function loadKpiTasks(db: Db, sprintId: string): Promise<KpiTask[]> {
  const rows = await db
    .select({
      id: tasks.id,
      sp: tasks.sp,
      addedAt: sprintTasks.addedAt,
      completedInDays: tasks.completedInDays,
      authorId: tasks.authorId,
      reviewerId: tasks.reviewerId,
      testerId: tasks.testerId,
      designerId: tasks.designerId,
    })
    .from(sprintTasks)
    .innerJoin(tasks, eq(tasks.id, sprintTasks.taskId))
    .where(eq(sprintTasks.sprintId, sprintId));
  if (rows.length === 0) return [];

  const intervals = await db
    .select({
      taskId: taskStatusIntervals.taskId,
      status: taskStatusIntervals.status,
      enteredAt: taskStatusIntervals.enteredAt,
      leftAt: taskStatusIntervals.leftAt,
      pausedSec: taskStatusIntervals.pausedSec,
    })
    .from(taskStatusIntervals)
    .where(inArray(taskStatusIntervals.taskId, rows.map((row) => row.id)))
    .orderBy(asc(taskStatusIntervals.enteredAt));

  const byTask = new Map<string, KpiTask['intervals']>();
  for (const { taskId, ...interval } of intervals) {
    const list = byTask.get(taskId);
    if (list) list.push(interval);
    else byTask.set(taskId, [interval]);
  }
  return rows.map(({ id, ...task }) => ({ ...task, intervals: byTask.get(id) ?? [] }));
}

export async function listNonGuestMemberIds(db: Db, boardId: number): Promise<string[]> {
  const rows = await db
    .select({ userId: boardMembers.userId })
    .from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), ne(boardMembers.role, 'guest')));
  return rows.map((row) => row.userId);
}

/** Закрытые спринты до указанного номера, от старых к новым. */
export async function listPreviousVelocity(
  db: Db,
  boardId: number,
  beforeNumber: number,
  limit: number,
): Promise<VelocityItem[]> {
  const rows = await db
    .select()
    .from(sprints)
    .where(
      and(
        eq(sprints.boardId, boardId),
        eq(sprints.state, 'closed'),
        lt(sprints.number, beforeNumber),
      ),
    )
    .orderBy(desc(sprints.number))
    .limit(limit);
  return rows.toReversed().map((row) => ({
    number: row.number,
    startDate: row.startDate,
    endDate: row.endDate,
    plannedSp: row.plannedSp ?? 0,
    doneSp: row.doneSp ?? 0,
    isActive: false,
  }));
}

export async function countTasksByStatus(db: Db, sprintId: string) {
  const rows = await db
    .select({ status: tasks.status, count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(eq(tasks.sprintId, sprintId))
    .groupBy(tasks.status);
  const counts: Record<TaskStatus, number> = { todo: 0, work: 0, review: 0, test: 0, done: 0 };
  for (const row of rows) counts[row.status] = row.count;
  return counts;
}
