import {
  type BoardRole,
  type CreateCommentBody,
  type CreateLinkBody,
  type CreateTaskBody,
  type ErrorCode,
  type MoveActor,
  type MoveTask,
  type MyTasksResponse,
  type TaskCard,
  type TaskComment,
  type TaskDetail,
  type TaskLinkItem,
  type TaskLinkType,
  type TaskRole,
  type TaskSearchResponse,
  type TaskStatus,
  type TaskTimer,
  type UpdateTaskBody,
  can,
  statusMoveError,
} from '@gwmt/contracts';

import type { Db } from '../../db/client.js';
import type { AppDeps, TaskAccess } from '../../lib/context.js';
import { AppError } from '../../lib/errors.js';
import { countWorkdays, dateInZone } from '../../lib/workdays.js';
import * as sprintsRepo from '../sprints/repo.js';
import { toSprintBrief } from '../sprints/service.js';
import * as repo from './repo.js';

const INVERSE_LINK: Record<TaskLinkType, TaskLinkType> = {
  rel: 'rel',
  blocks: 'blockedBy',
  blockedBy: 'blocks',
  dup: 'dup',
};

const PAUSABLE: readonly TaskStatus[] = ['work', 'review', 'test'];

type Timed = {
  status: TaskStatus;
  statusEnteredAt: Date;
  pausedAt: Date | null;
  pausedTotalSec: number;
  completedInDays: null | number;
};

export const toTimer = (task: Timed): TaskTimer => ({
  statusEnteredAt: task.statusEnteredAt.toISOString(),
  pausedAt: task.pausedAt?.toISOString() ?? null,
  pausedTotalSec: task.pausedTotalSec,
  canPause: PAUSABLE.includes(task.status),
  completedInDays: task.status === 'done' ? task.completedInDays : null,
});

export const toTaskCard = (row: repo.TaskCardRow): TaskCard => ({
  id: row.id,
  key: row.key,
  boardId: row.boardId,
  sprintId: row.sprintId,
  title: row.title,
  status: row.status,
  priority: row.priority,
  sp: row.sp,
  createdAt: row.createdAt.toISOString(),
  timer: toTimer(row),
  linkCount: row.linkCount,
  isBlocked: row.isBlocked,
  isTakeLocked: row.takeLocked,
  people: {
    author: row.author,
    reviewer: row.reviewer,
    tester: row.tester,
    designer: row.designer,
  },
});

async function loadCard(db: Db, taskId: string): Promise<TaskCard> {
  const row = await repo.findCard(db, taskId);
  if (!row) throw new AppError('TASK_NOT_FOUND');
  return toTaskCard(row);
}

type AssigneeField = 'authorId' | 'designerId' | 'reviewerId' | 'testerId';
type Assignees = Partial<Record<AssigneeField, null | string | undefined>>;

const ASSIGNEE_FIELDS: AssigneeField[] = [
  'authorId',
  'reviewerId',
  'testerId',
  'designerId',
];

async function assertAssignable(db: Db, boardId: number, people: Assignees) {
  const entries = ASSIGNEE_FIELDS.flatMap((field) => {
    const userId = people[field];
    return userId ? [{ field, userId }] : [];
  });
  if (entries.length === 0) return;

  const roles = await repo.listMemberRoles(
    db,
    boardId,
    entries.map((entry) => entry.userId),
  );
  let code: ErrorCode | null = null;
  const fields: Record<string, string> = {};
  for (const { field, userId } of entries) {
    const role = roles.get(userId);
    if (!role) {
      code ??= 'NOT_BOARD_MEMBER';
      fields[field] = 'Этот человек не состоит в доске';
    } else if (role === 'guest') {
      code ??= 'ASSIGNEE_IS_GUEST';
      fields[field] = 'Гостя нельзя назначить на задачу';
    }
  }
  if (code) throw new AppError(code, { fields });
}

export async function listBoardTasks(deps: AppDeps, boardId: number) {
  const sprint = await sprintsRepo.findActiveSprint(deps.db, boardId);
  if (!sprint) throw new AppError('BOARD_NOT_FOUND');
  const rows = await repo.listCardsBySprint(deps.db, sprint.id);
  return {
    sprint: toSprintBrief(sprint),
    items: rows.map(toTaskCard),
    serverTime: deps.now().toISOString(),
  };
}

function completedDays(
  firstStartedAt: Date | null,
  doneAt: Date,
  timezone: string,
): number {
  if (!firstStartedAt) return 1;
  return Math.max(
    1,
    countWorkdays(
      dateInZone(firstStartedAt, timezone),
      dateInZone(doneAt, timezone),
    ),
  );
}

export async function createTask(
  deps: AppDeps,
  boardId: number,
  actorId: string,
  body: CreateTaskBody,
): Promise<TaskCard> {
  const status = body.status ?? 'todo';
  const now = deps.now();

  return deps.withTx(async (tx) => {
    await assertAssignable(tx, boardId, body);
    const sprint = await sprintsRepo.findActiveSprint(tx, boardId);
    if (!sprint) throw new AppError('BOARD_NOT_FOUND');

    const { number, boardKey } = await repo.takeNextTaskNumber(tx, boardId);
    const taskId = await repo.insertTask(tx, {
      boardId,
      number,
      key: `${boardKey}-${number}`,
      sprintId: sprint.id,
      title: body.title,
      description: body.description ?? '',
      priority: body.priority ?? 'med',
      sp: body.sp,
      status,
      authorId: body.authorId,
      reviewerId: body.reviewerId,
      testerId: body.testerId ?? null,
      designerId: body.designerId ?? null,
      createdBy: actorId,
      statusEnteredAt: now,
      completedInDays: status === 'done' ? 1 : null,
      createdAt: now,
      updatedAt: now,
    });
    await repo.addTaskToSprint(tx, sprint.id, taskId, now);
    await repo.insertInterval(tx, {
      taskId,
      status,
      enteredAt: now,
      changedBy: actorId,
    });
    return loadCard(tx, taskId);
  });
}

function assertMoveAllowed(actor: MoveActor, task: MoveTask, to: TaskStatus) {
  const error = statusMoveError(actor, task, to);
  if (error) throw new AppError(error);
}

const toMoveTask = (task: {
  status: TaskStatus;
  takeLocked: boolean;
  reviewerId: string;
  testerId: null | string;
}): MoveTask => ({
  status: task.status,
  isTakeLocked: task.takeLocked,
  reviewerId: task.reviewerId,
  testerId: task.testerId,
});

export async function updateTask(
  deps: AppDeps,
  access: TaskAccess,
  actor: MoveActor,
  body: UpdateTaskBody,
): Promise<TaskCard> {
  // Быстрый отказ без транзакции. Настоящая проверка ниже, по заблокированной строке.
  if (body.status !== undefined) {
    const current = await repo.findTask(deps.db, access.id);
    if (!current) throw new AppError('TASK_NOT_FOUND');
    assertMoveAllowed(actor, toMoveTask(current), body.status);
  }

  const now = deps.now();
  return deps.withTx(async (tx) => {
    const locked = await repo.lockTask(tx, access.id);
    if (!locked) throw new AppError('TASK_NOT_FOUND');
    const { task, timezone } = locked;

    if (body.status !== undefined)
      assertMoveAllowed(actor, toMoveTask(task), body.status);

    // Нынешнего человека можно оставить, даже если его убрали с доски или понизили до гостя.
    const changedPeople: Assignees = {};
    for (const field of ASSIGNEE_FIELDS) {
      const value = body[field];
      if (value !== undefined && value !== task[field])
        changedPeople[field] = value;
    }
    await assertAssignable(tx, task.boardId, changedPeople);

    const values = { ...changedPeople } as Partial<typeof task>;
    if (body.title !== undefined) values.title = body.title;
    if (body.description !== undefined) values.description = body.description;
    if (body.priority !== undefined) values.priority = body.priority;
    if (body.sp !== undefined) values.sp = body.sp;

    if (body.status !== undefined && body.status !== task.status) {
      const to = body.status;
      const unfinishedPauseSec = task.pausedAt
        ? Math.floor((now.getTime() - task.pausedAt.getTime()) / 1000)
        : 0;
      await repo.closeOpenInterval(tx, task.id, now, unfinishedPauseSec);
      await repo.insertInterval(tx, {
        taskId: task.id,
        status: to,
        enteredAt: now,
        changedBy: actor.id,
      });

      values.status = to;
      values.statusEnteredAt = now;
      values.pausedAt = null;
      values.pausedTotalSec = 0;
      if (to === 'done') {
        const firstStartedAt = await repo.firstWorkStartedAt(tx, task.id);
        values.completedInDays = completedDays(firstStartedAt, now, timezone);
      } else if (task.status === 'done') {
        values.completedInDays = null;
      }
      if (task.status === 'todo') values.takeLocked = false;
    }

    if (Object.keys(values).length > 0) {
      await repo.updateTask(tx, task.id, { ...values, updatedAt: now });
    }
    return loadCard(tx, task.id);
  });
}

export async function setTakeLock(
  deps: AppDeps,
  taskId: string,
): Promise<TaskCard> {
  const task = await repo.findTask(deps.db, taskId);
  if (!task) throw new AppError('TASK_NOT_FOUND');
  if (
    !task.takeLocked &&
    !(await repo.setTakeLockIfTodo(deps.db, taskId, deps.now()))
  ) {
    throw new AppError('TASK_NOT_LOCKABLE');
  }
  return loadCard(deps.db, taskId);
}

export async function clearTakeLock(
  deps: AppDeps,
  taskId: string,
): Promise<TaskCard> {
  await repo.clearTakeLock(deps.db, taskId, deps.now());
  return loadCard(deps.db, taskId);
}

export async function pauseTask(
  deps: AppDeps,
  taskId: string,
): Promise<TaskCard> {
  if (!(await repo.startPause(deps.db, taskId, deps.now()))) {
    const task = await repo.findTask(deps.db, taskId);
    if (!task) throw new AppError('TASK_NOT_FOUND');
    if (!PAUSABLE.includes(task.status))
      throw new AppError('TASK_NOT_PAUSABLE');
  }
  return loadCard(deps.db, taskId);
}

export async function resumeTask(
  deps: AppDeps,
  taskId: string,
): Promise<TaskCard> {
  const now = deps.now();
  return deps.withTx(async (tx) => {
    const locked = await repo.lockTask(tx, taskId);
    if (!locked) throw new AppError('TASK_NOT_FOUND');
    const { task } = locked;

    if (task.pausedAt) {
      const seconds = Math.floor(
        (now.getTime() - task.pausedAt.getTime()) / 1000,
      );
      await repo.updateTask(tx, taskId, {
        pausedAt: null,
        pausedTotalSec: task.pausedTotalSec + seconds,
        updatedAt: now,
      });
      await repo.addPauseToOpenInterval(tx, taskId, seconds);
    }
    return loadCard(tx, taskId);
  });
}

export async function createLink(
  deps: AppDeps,
  access: TaskAccess,
  userId: string,
  body: CreateLinkBody,
): Promise<TaskLinkItem> {
  if (body.targetKey === access.key) throw new AppError('TASK_LINK_SELF');

  const target = await repo.findLinkTarget(deps.db, body.targetKey, userId);
  if (!target?.role) throw new AppError('TASK_NOT_FOUND');
  if (!can(target.role, 'task.link')) throw new AppError('ROLE_FORBIDDEN');

  const now = deps.now();
  const created = await repo.insertLinkPair(deps.db, [
    {
      taskId: access.id,
      targetTaskId: target.id,
      type: body.type,
      createdAt: now,
    },
    {
      taskId: target.id,
      targetTaskId: access.id,
      type: INVERSE_LINK[body.type],
      createdAt: now,
    },
  ]);
  if (!created) throw new AppError('TASK_LINK_EXISTS');

  return {
    type: body.type,
    task: {
      key: target.key,
      title: target.title,
      status: target.status,
      boardName: target.boardName,
      canOpen: true,
    },
  };
}

export async function deleteLink(
  deps: AppDeps,
  access: TaskAccess,
  userId: string,
  targetKey: string,
): Promise<void> {
  const target = await repo.findLinkTarget(deps.db, targetKey, userId);
  if (!target) return;
  if (!target.role || !can(target.role, 'task.link'))
    throw new AppError('ROLE_FORBIDDEN');
  await repo.deleteLinkPair(deps.db, access.id, target.id);
}

export async function createComment(
  deps: AppDeps,
  taskId: string,
  userId: string,
  body: CreateCommentBody,
): Promise<TaskComment> {
  const now = deps.now();
  const comment = await repo.insertComment(deps.db, {
    taskId,
    authorId: userId,
    text: body.text,
    createdAt: now,
  });
  const card = await repo.listTaskComments(deps.db, taskId);
  const author = card.find((item) => item.id === comment.id)?.author;
  if (!author) throw new AppError('TASK_NOT_FOUND');
  return {
    id: comment.id,
    author,
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
  };
}

export async function getTaskDetail(
  deps: AppDeps,
  access: TaskAccess,
  userId: string,
  role: BoardRole,
): Promise<TaskDetail> {
  const [row, meta, links, comments] = await Promise.all([
    repo.findCard(deps.db, access.id),
    repo.findTaskMeta(deps.db, access.id),
    repo.listTaskLinks(deps.db, access.id, userId),
    repo.listTaskComments(deps.db, access.id),
  ]);
  if (!row || !meta) throw new AppError('TASK_NOT_FOUND');

  const currentPeople = [
    row.author.id,
    row.reviewer.id,
    row.tester?.id,
    row.designer?.id,
  ].filter((id): id is string => id !== undefined);
  const assigneeOptions = await repo.listAssigneeOptions(
    deps.db,
    row.boardId,
    currentPeople,
  );

  return {
    ...toTaskCard(row),
    description: meta.description,
    board: { id: meta.boardId, key: meta.boardKey, name: meta.boardName },
    sprint: toSprintBrief(meta.sprint),
    myRole: role,
    links: links.map((link) => ({
      type: link.type,
      task: {
        key: link.key,
        title: link.title,
        status: link.status,
        boardName: link.boardName,
        canOpen: link.viewerRole !== null,
      },
    })),
    comments: comments.map((comment) => ({
      id: comment.id,
      author: comment.author,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
    })),
    assigneeOptions,
    serverTime: deps.now().toISOString(),
  };
}

export async function searchTasks(
  deps: AppDeps,
  userId: string,
  query: {
    q?: string | undefined;
    excludeLinkedTo?: string | undefined;
    limit: number;
  },
): Promise<TaskSearchResponse> {
  const rows = await repo.searchTasks(deps.db, userId, query);
  return {
    items: rows.map((row) => ({
      key: row.key,
      title: row.title,
      status: row.status,
      board: { id: row.boardId, name: row.boardName },
    })),
  };
}

function rolesOf(row: repo.MyTaskRow, userId: string): TaskRole[] {
  const roles: TaskRole[] = [];
  if (row.authorId === userId) roles.push('author');
  if (row.reviewerId === userId) roles.push('reviewer');
  if (row.testerId === userId) roles.push('tester');
  if (row.designerId === userId) roles.push('designer');
  return roles;
}

export async function listMyTasks(
  deps: AppDeps,
  userId: string,
  query: repo.MyTasksFilter & { page: number; pageSize: number },
): Promise<MyTasksResponse> {
  const { page, pageSize, ...filter } = query;
  const [rows, filtered, overall] = await Promise.all([
    repo.listMyTasks(deps.db, userId, filter, pageSize, (page - 1) * pageSize),
    repo.countMyTasks(deps.db, userId, filter),
    repo.countMyTasks(deps.db, userId, {}),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      key: row.key,
      title: row.title,
      board: { id: row.boardId, name: row.boardName },
      roles: rolesOf(row, userId),
      status: row.status,
      priority: row.priority,
      sp: row.sp,
      createdAt: row.createdAt.toISOString(),
      timer: toTimer(row),
    })),
    page,
    pageSize,
    total: filtered.count,
    summary: { totalCount: overall.count, totalSp: overall.spTenths / 10 },
    serverTime: deps.now().toISOString(),
  };
}
