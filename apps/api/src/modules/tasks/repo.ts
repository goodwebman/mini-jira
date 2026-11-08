import type { BoardRole, TaskRole, TaskStatus } from '@gwmt/contracts';
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias, type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { Db } from '../../db/client.js';
import {
  boardMembers,
  boards,
  sprints,
  sprintTasks,
  taskComments,
  taskLinks,
  tasks,
  taskStatusIntervals,
  users,
} from '../../db/schema.js';
import { containsPattern } from '../../lib/search.js';
import { userBriefColumns } from '../boards/repo.js';

const author = alias(users, 'task_author');
const reviewer = alias(users, 'task_reviewer');
const tester = alias(users, 'task_tester');
const designer = alias(users, 'task_designer');

const cardColumns = {
  id: tasks.id,
  key: tasks.key,
  boardId: tasks.boardId,
  sprintId: tasks.sprintId,
  title: tasks.title,
  status: tasks.status,
  priority: tasks.priority,
  sp: tasks.sp,
  createdAt: tasks.createdAt,
  statusEnteredAt: tasks.statusEnteredAt,
  pausedAt: tasks.pausedAt,
  pausedTotalSec: tasks.pausedTotalSec,
  completedInDays: tasks.completedInDays,
  takeLocked: tasks.takeLocked,
  linkCount: sql<number>`(select count(*)::int from task_links link where link.task_id = ${tasks.id})`,
  isBlocked: sql<boolean>`(${tasks.status} <> 'done' and exists (
    select 1 from task_links link
    join tasks blocker on blocker.id = link.target_task_id
    where link.task_id = ${tasks.id} and link.type = 'blockedBy' and blocker.status <> 'done'
  ))`,
  author: { id: author.id, name: author.name, job: author.job, colorIndex: author.colorIndex },
  reviewer: {
    id: reviewer.id,
    name: reviewer.name,
    job: reviewer.job,
    colorIndex: reviewer.colorIndex,
  },
  tester: { id: tester.id, name: tester.name, job: tester.job, colorIndex: tester.colorIndex },
  designer: {
    id: designer.id,
    name: designer.name,
    job: designer.job,
    colorIndex: designer.colorIndex,
  },
};

const cardQuery = (db: Db) =>
  db
    .select(cardColumns)
    .from(tasks)
    .innerJoin(author, eq(author.id, tasks.authorId))
    .innerJoin(reviewer, eq(reviewer.id, tasks.reviewerId))
    .leftJoin(tester, eq(tester.id, tasks.testerId))
    .leftJoin(designer, eq(designer.id, tasks.designerId));

export type TaskCardRow = Awaited<ReturnType<typeof cardQuery>>[number];

export async function findCard(db: Db, taskId: string): Promise<TaskCardRow | null> {
  const [row] = await cardQuery(db).where(eq(tasks.id, taskId));
  return row ?? null;
}

export function listCardsBySprint(db: Db, sprintId: string) {
  return cardQuery(db)
    .where(eq(tasks.sprintId, sprintId))
    .orderBy(asc(tasks.createdAt), asc(tasks.number));
}

export async function findTaskMeta(db: Db, taskId: string) {
  const [row] = await db
    .select({
      description: tasks.description,
      boardId: boards.id,
      boardKey: boards.key,
      boardName: boards.name,
      sprint: sprints,
    })
    .from(tasks)
    .innerJoin(boards, eq(boards.id, tasks.boardId))
    .innerJoin(sprints, eq(sprints.id, tasks.sprintId))
    .where(eq(tasks.id, taskId));
  return row ?? null;
}

export function listTaskLinks(db: Db, taskId: string, userId: string) {
  return db
    .select({
      type: taskLinks.type,
      key: tasks.key,
      title: tasks.title,
      status: tasks.status,
      boardName: boards.name,
      viewerRole: boardMembers.role,
    })
    .from(taskLinks)
    .innerJoin(tasks, eq(tasks.id, taskLinks.targetTaskId))
    .innerJoin(boards, eq(boards.id, tasks.boardId))
    .leftJoin(
      boardMembers,
      and(eq(boardMembers.boardId, tasks.boardId), eq(boardMembers.userId, userId)),
    )
    .where(eq(taskLinks.taskId, taskId))
    .orderBy(asc(taskLinks.createdAt), asc(tasks.key));
}

export function listTaskComments(db: Db, taskId: string) {
  return db
    .select({
      id: taskComments.id,
      text: taskComments.text,
      createdAt: taskComments.createdAt,
      author: userBriefColumns,
    })
    .from(taskComments)
    .innerJoin(users, eq(users.id, taskComments.authorId))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt), asc(taskComments.id));
}

export function listAssigneeOptions(db: Db, boardId: number, currentPeople: string[]) {
  return db
    .select(userBriefColumns)
    .from(users)
    .where(
      or(
        inArray(
          users.id,
          db
            .select({ id: boardMembers.userId })
            .from(boardMembers)
            .where(and(eq(boardMembers.boardId, boardId), ne(boardMembers.role, 'guest'))),
        ),
        inArray(users.id, currentPeople),
      ),
    )
    .orderBy(asc(users.name));
}

export async function listMemberRoles(db: Db, boardId: number, userIds: string[]) {
  const rows = await db
    .select({ userId: boardMembers.userId, role: boardMembers.role })
    .from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), inArray(boardMembers.userId, userIds)));
  return new Map<string, BoardRole>(rows.map((row) => [row.userId, row.role]));
}

/** Атомарно выдаёт следующий номер: параллельные создания ждут друг друга на строке доски. */
export async function takeNextTaskNumber(db: Db, boardId: number) {
  const [row] = await db
    .update(boards)
    .set({ taskSeq: sql`${boards.taskSeq} + 1` })
    .where(eq(boards.id, boardId))
    .returning({ number: boards.taskSeq, boardKey: boards.key, timezone: boards.timezone });
  if (!row) throw new Error('board not found');
  return row;
}

export async function insertTask(db: Db, values: typeof tasks.$inferInsert) {
  const [task] = await db.insert(tasks).values(values).returning({ id: tasks.id });
  if (!task) throw new Error('task was not created');
  return task.id;
}

export async function addTaskToSprint(db: Db, sprintId: string, taskId: string, addedAt: Date) {
  await db.insert(sprintTasks).values({ sprintId, taskId, addedAt });
}

export async function insertInterval(
  db: Db,
  values: { taskId: string; status: TaskStatus; enteredAt: Date; changedBy: string },
) {
  await db.insert(taskStatusIntervals).values(values);
}

export async function closeOpenInterval(
  db: Db,
  taskId: string,
  leftAt: Date,
  extraPausedSec: number,
) {
  await db
    .update(taskStatusIntervals)
    .set({
      leftAt,
      pausedSec: sql`${taskStatusIntervals.pausedSec} + ${extraPausedSec}`,
    })
    .where(and(eq(taskStatusIntervals.taskId, taskId), isNull(taskStatusIntervals.leftAt)));
}

export async function addPauseToOpenInterval(db: Db, taskId: string, seconds: number) {
  await db
    .update(taskStatusIntervals)
    .set({ pausedSec: sql`${taskStatusIntervals.pausedSec} + ${seconds}` })
    .where(and(eq(taskStatusIntervals.taskId, taskId), isNull(taskStatusIntervals.leftAt)));
}

export async function firstWorkStartedAt(db: Db, taskId: string) {
  const [row] = await db
    .select({ enteredAt: taskStatusIntervals.enteredAt })
    .from(taskStatusIntervals)
    .where(and(eq(taskStatusIntervals.taskId, taskId), ne(taskStatusIntervals.status, 'todo')))
    .orderBy(asc(taskStatusIntervals.enteredAt))
    .limit(1);
  return row?.enteredAt ?? null;
}

export async function lockTask(db: Db, taskId: string) {
  const [row] = await db
    .select({
      task: tasks,
      timezone: boards.timezone,
    })
    .from(tasks)
    .innerJoin(boards, eq(boards.id, tasks.boardId))
    .where(eq(tasks.id, taskId))
    .for('update', { of: tasks });
  return row ?? null;
}

export async function findTask(db: Db, taskId: string) {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  return row ?? null;
}

export async function updateTask(
  db: Db,
  taskId: string,
  values: Partial<typeof tasks.$inferInsert>,
) {
  await db.update(tasks).set(values).where(eq(tasks.id, taskId));
}

/** false значит, что задача не в todo. */
export async function setTakeLockIfTodo(db: Db, taskId: string, now: Date) {
  const updated = await db
    .update(tasks)
    .set({ takeLocked: true, updatedAt: now })
    .where(and(eq(tasks.id, taskId), eq(tasks.status, 'todo')))
    .returning({ id: tasks.id });
  return updated.length > 0;
}

export async function clearTakeLock(db: Db, taskId: string, now: Date) {
  await db
    .update(tasks)
    .set({ takeLocked: false, updatedAt: now })
    .where(and(eq(tasks.id, taskId), eq(tasks.takeLocked, true)));
}

/** false значит, что задача уже на паузе или статус не подходит: причину разберёт сервис. */
export async function startPause(db: Db, taskId: string, now: Date) {
  const updated = await db
    .update(tasks)
    .set({ pausedAt: now, updatedAt: now })
    .where(
      and(
        eq(tasks.id, taskId),
        inArray(tasks.status, ['work', 'review', 'test']),
        isNull(tasks.pausedAt),
      ),
    )
    .returning({ id: tasks.id });
  return updated.length > 0;
}

export async function findLinkTarget(db: Db, key: string, userId: string) {
  const [row] = await db
    .select({
      id: tasks.id,
      key: tasks.key,
      title: tasks.title,
      status: tasks.status,
      boardName: boards.name,
      role: boardMembers.role,
    })
    .from(tasks)
    .innerJoin(boards, eq(boards.id, tasks.boardId))
    .leftJoin(
      boardMembers,
      and(eq(boardMembers.boardId, tasks.boardId), eq(boardMembers.userId, userId)),
    )
    .where(eq(tasks.key, key));
  return row ?? null;
}

/**
 * Обе стороны одним запросом и в постоянном порядке строк: встречные запросы A-B и B-A
 * блокируют строки одинаково и не приходят к взаимной блокировке.
 */
export async function insertLinkPair(db: Db, rows: (typeof taskLinks.$inferInsert)[]) {
  const ordered = rows.toSorted((a, b) => a.taskId.localeCompare(b.taskId));
  const inserted = await db
    .insert(taskLinks)
    .values(ordered)
    .onConflictDoNothing()
    .returning({ taskId: taskLinks.taskId });
  return inserted.length > 0;
}

export async function deleteLinkPair(db: Db, taskId: string, targetId: string) {
  await db
    .delete(taskLinks)
    .where(
      or(
        and(eq(taskLinks.taskId, taskId), eq(taskLinks.targetTaskId, targetId)),
        and(eq(taskLinks.taskId, targetId), eq(taskLinks.targetTaskId, taskId)),
      ),
    );
}

export async function insertComment(db: Db, values: typeof taskComments.$inferInsert) {
  const [comment] = await db.insert(taskComments).values(values).returning();
  if (!comment) throw new Error('comment was not created');
  return comment;
}

export function searchTasks(
  db: Db,
  userId: string,
  query: { q?: string | undefined; excludeLinkedTo?: string | undefined; limit: number },
) {
  const { q, excludeLinkedTo, limit } = query;
  return db
    .select({
      key: tasks.key,
      title: tasks.title,
      status: tasks.status,
      boardId: boards.id,
      boardName: boards.name,
    })
    .from(tasks)
    .innerJoin(boards, eq(boards.id, tasks.boardId))
    .innerJoin(
      boardMembers,
      and(eq(boardMembers.boardId, tasks.boardId), eq(boardMembers.userId, userId)),
    )
    .where(
      and(
        inArray(boardMembers.role, ['admin', 'worker']),
        q ? or(ilike(tasks.title, containsPattern(q)), ilike(tasks.key, containsPattern(q))) : undefined,
        excludeLinkedTo ? ne(tasks.key, excludeLinkedTo) : undefined,
        excludeLinkedTo
          ? notInArray(
              tasks.id,
              db
                .select({ id: taskLinks.targetTaskId })
                .from(taskLinks)
                .where(
                  eq(
                    taskLinks.taskId,
                    sql`(select id from tasks where key = ${excludeLinkedTo})`,
                  ),
                ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(tasks.updatedAt), desc(tasks.number))
    .limit(limit);
}

const isParticipant = (userId: string) =>
  or(
    eq(tasks.authorId, userId),
    eq(tasks.reviewerId, userId),
    eq(tasks.testerId, userId),
    eq(tasks.designerId, userId),
  );

const STATUS_ORDER = sql`array_position(array['work','review','test','todo','done']::task_status[], ${tasks.status})`;

const ROLE_COLUMN: Record<TaskRole, AnyPgColumn> = {
  author: tasks.authorId,
  reviewer: tasks.reviewerId,
  tester: tasks.testerId,
  designer: tasks.designerId,
};

/** Удалённый с доски участник сюда не попадает: задачи берутся только с его досок. */
const myTasksFrom = (db: Db, userId: string) =>
  db
    .select({
      id: tasks.id,
      key: tasks.key,
      title: tasks.title,
      boardId: boards.id,
      boardName: boards.name,
      status: tasks.status,
      priority: tasks.priority,
      sp: tasks.sp,
      createdAt: tasks.createdAt,
      statusEnteredAt: tasks.statusEnteredAt,
      pausedAt: tasks.pausedAt,
      pausedTotalSec: tasks.pausedTotalSec,
      completedInDays: tasks.completedInDays,
      authorId: tasks.authorId,
      reviewerId: tasks.reviewerId,
      testerId: tasks.testerId,
      designerId: tasks.designerId,
    })
    .from(tasks)
    .innerJoin(boards, eq(boards.id, tasks.boardId))
    .innerJoin(
      boardMembers,
      and(eq(boardMembers.boardId, tasks.boardId), eq(boardMembers.userId, userId)),
    );

export type MyTaskRow = Awaited<ReturnType<typeof myTasksFrom>>[number];

export interface MyTasksFilter {
  q?: string | undefined;
  status?: TaskStatus | undefined;
  role?: TaskRole | undefined;
}

function myTasksCondition(userId: string, filter: MyTasksFilter): SQL | undefined {
  const { q, status, role } = filter;
  return and(
    isParticipant(userId),
    q ? or(ilike(tasks.title, containsPattern(q)), ilike(tasks.key, containsPattern(q))) : undefined,
    status ? eq(tasks.status, status) : undefined,
    role ? eq(ROLE_COLUMN[role], userId) : undefined,
  );
}

export function listMyTasks(
  db: Db,
  userId: string,
  filter: MyTasksFilter,
  limit: number,
  offset: number,
) {
  return myTasksFrom(db, userId)
    .where(myTasksCondition(userId, filter))
    .orderBy(STATUS_ORDER, asc(boards.key), asc(tasks.number))
    .limit(limit)
    .offset(offset);
}

export async function countMyTasks(db: Db, userId: string, filter: MyTasksFilter) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      spTenths: sql<number>`coalesce(sum((${tasks.sp} * 10)::int), 0)::int`,
      openCount: sql<number>`count(*) filter (where ${tasks.status} <> 'done')::int`,
      openSpTenths: sql<number>`coalesce(sum((${tasks.sp} * 10)::int) filter (where ${tasks.status} <> 'done'), 0)::int`,
    })
    .from(tasks)
    .innerJoin(
      boardMembers,
      and(eq(boardMembers.boardId, tasks.boardId), eq(boardMembers.userId, userId)),
    )
    .where(myTasksCondition(userId, filter));
  return row ?? { count: 0, spTenths: 0, openCount: 0, openSpTenths: 0 };
}

export function listMyOpenTasks(db: Db, userId: string, limit: number) {
  return myTasksFrom(db, userId)
    .where(and(isParticipant(userId), ne(tasks.status, 'done')))
    .orderBy(STATUS_ORDER, asc(boards.key), asc(tasks.number))
    .limit(limit);
}

export async function countBoards(db: Db, userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(boardMembers)
    .where(eq(boardMembers.userId, userId));
  return row?.count ?? 0;
}

export async function findLatestBoardId(db: Db, userId: string) {
  const [row] = await db
    .select({ boardId: boardMembers.boardId })
    .from(boardMembers)
    .where(eq(boardMembers.userId, userId))
    .orderBy(desc(boardMembers.addedAt), desc(boardMembers.boardId))
    .limit(1);
  return row?.boardId ?? null;
}
