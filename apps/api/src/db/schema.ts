import type { Timezone } from '@gwmt/contracts';
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { SprintKpiSnapshot } from '../modules/kpi/compute.js';

const citext = customType<{ data: string }>({ dataType: () => 'citext' });
const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const boardRoleEnum = pgEnum('board_role', ['admin', 'worker', 'guest']);
export const sprintStateEnum = pgEnum('sprint_state', ['active', 'closed']);
export const taskStatusEnum = pgEnum('task_status', ['todo', 'work', 'review', 'test', 'done']);
export const taskPriorityEnum = pgEnum('task_priority', ['crit', 'high', 'med', 'low']);
export const taskLinkTypeEnum = pgEnum('task_link_type', ['rel', 'blocks', 'blockedBy', 'dup']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: citext('email').notNull().unique(),
  passwordHash: text('password_hash'),
  githubId: bigint('github_id', { mode: 'number' }).unique(),
  googleId: text('google_id').unique(),
  name: text('name').notNull(),
  job: text('job').notNull().default(''),
  timezone: text('timezone').$type<Timezone>().notNull().default('Europe/Moscow'),
  colorIndex: smallint('color_index').notNull(),
  termsAcceptedAt: timestamptz('terms_accepted_at').notNull(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  updatedAt: timestamptz('updated_at').notNull().defaultNow(),
});

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    remember: boolean('remember').notNull(),
    expiresAt: timestamptz('expires_at').notNull(),
    revokedAt: timestamptz('revoked_at'),
    lastUsedAt: timestamptz('last_used_at').notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [index('auth_sessions_user_id_idx').on(t.userId)],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => authSessions.id),
    tokenHash: text('token_hash').notNull().unique(),
    usedAt: timestamptz('used_at'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [index('refresh_tokens_session_id_idx').on(t.sessionId)],
);

export const authThrottle = pgTable('auth_throttle', {
  key: text('key').primaryKey(),
  fails: integer('fails').notNull(),
  windowStartedAt: timestamptz('window_started_at').notNull(),
  lockedUntil: timestamptz('locked_until'),
});

export const boards = pgTable('boards', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  key: varchar('key', { length: 6 }).notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  colorIndex: smallint('color_index').notNull(),
  timezone: text('timezone').$type<Timezone>().notNull(),
  taskSeq: integer('task_seq').notNull().default(100),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
});

export const boardMembers = pgTable(
  'board_members',
  {
    boardId: integer('board_id')
      .notNull()
      .references(() => boards.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: boardRoleEnum('role').notNull().default('worker'),
    addedAt: timestamptz('added_at').notNull().defaultNow(),
    addedBy: uuid('added_by')
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    primaryKey({ columns: [t.boardId, t.userId] }),
    index('board_members_user_id_idx').on(t.userId),
  ],
);

export const boardFavorites = pgTable(
  'board_favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    boardId: integer('board_id')
      .notNull()
      .references(() => boards.id),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.boardId] })],
);

export const sprints = pgTable(
  'sprints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    boardId: integer('board_id')
      .notNull()
      .references(() => boards.id),
    number: integer('number').notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    state: sprintStateEnum('state').notNull(),
    plannedSp: numeric('planned_sp', { mode: 'number' }),
    doneSp: numeric('done_sp', { mode: 'number' }),
    kpiSnapshot: jsonb('kpi_snapshot').$type<SprintKpiSnapshot>(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [
    unique('sprints_board_number_unique').on(t.boardId, t.number),
    uniqueIndex('sprints_one_active_idx').on(t.boardId).where(sql`${t.state} = 'active'`),
  ],
);

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    boardId: integer('board_id')
      .notNull()
      .references(() => boards.id),
    number: integer('number').notNull(),
    key: text('key').notNull().unique(),
    sprintId: uuid('sprint_id')
      .notNull()
      .references(() => sprints.id),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    priority: taskPriorityEnum('priority').notNull(),
    sp: numeric('sp', { precision: 4, scale: 1, mode: 'number' }).notNull(),
    status: taskStatusEnum('status').notNull(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id),
    testerId: uuid('tester_id').references(() => users.id),
    designerId: uuid('designer_id').references(() => users.id),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    statusEnteredAt: timestamptz('status_entered_at').notNull(),
    pausedAt: timestamptz('paused_at'),
    pausedTotalSec: integer('paused_total_sec').notNull().default(0),
    completedInDays: integer('completed_in_days'),
    takeLocked: boolean('take_locked').notNull().default(false),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('tasks_board_number_unique').on(t.boardId, t.number),
    index('tasks_sprint_id_idx').on(t.sprintId),
    index('tasks_author_id_idx').on(t.authorId),
    index('tasks_reviewer_id_idx').on(t.reviewerId),
    index('tasks_tester_id_idx').on(t.testerId),
    index('tasks_designer_id_idx').on(t.designerId),
    index('tasks_title_trgm_idx').using('gin', t.title.op('gin_trgm_ops')),
  ],
);

export const sprintTasks = pgTable(
  'sprint_tasks',
  {
    sprintId: uuid('sprint_id')
      .notNull()
      .references(() => sprints.id),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id),
    addedAt: timestamptz('added_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.sprintId, t.taskId] }),
    index('sprint_tasks_task_id_idx').on(t.taskId),
  ],
);

export const taskStatusIntervals = pgTable(
  'task_status_intervals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id),
    status: taskStatusEnum('status').notNull(),
    enteredAt: timestamptz('entered_at').notNull(),
    leftAt: timestamptz('left_at'),
    pausedSec: integer('paused_sec').notNull().default(0),
    changedBy: uuid('changed_by')
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    index('task_status_intervals_task_entered_idx').on(t.taskId, t.enteredAt),
    uniqueIndex('task_status_intervals_open_idx').on(t.taskId).where(sql`${t.leftAt} is null`),
  ],
);

export const taskLinks = pgTable(
  'task_links',
  {
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id),
    targetTaskId: uuid('target_task_id')
      .notNull()
      .references(() => tasks.id),
    type: taskLinkTypeEnum('type').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.targetTaskId] }),
    index('task_links_target_task_id_idx').on(t.targetTaskId),
    check('task_links_no_self', sql`${t.taskId} <> ${t.targetTaskId}`),
  ],
);

export const taskComments = pgTable(
  'task_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    text: text('text').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [index('task_comments_task_created_idx').on(t.taskId, t.createdAt)],
);

export type UserRow = typeof users.$inferSelect;
export type BoardRow = typeof boards.$inferSelect;
export type SprintRow = typeof sprints.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
