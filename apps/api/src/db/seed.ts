import type { BoardRole, TaskPriority, TaskStatus } from '@gwmt/contracts';
import { Pool } from '@neondatabase/serverless';
import { inArray, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { hashPassword } from '../lib/password.js';
import {
  type IsoDate,
  SPRINT_LENGTH_DAYS,
  addDays,
  countWorkdays,
  dateInZone,
  diffDays,
  sprintEndDate,
  sprintWorkdays,
  startOfDayInZone,
} from '../lib/workdays.js';
import {
  type KpiTask,
  type VelocityItem,
  computeSprintKpi,
} from '../modules/kpi/compute.js';
import type { Db } from './client.js';
import * as schema from './schema.js';

const {
  boardFavorites,
  boardMembers,
  boards,
  sprints,
  sprintTasks,
  taskComments,
  taskLinks,
  tasks,
  taskStatusIntervals,
  users,
} = schema;

const TIMEZONE = 'Europe/Moscow';
const GRID_ANCHOR: IsoDate = '2025-01-06'; // понедельник, от него строится сетка спринтов
const MAX_CLOSED_SPRINTS = 6;
const LAST_DAY = 9;
const INSERT_CHUNK = 200;

const TESTER_JOB = 'Тестировщик';
const DESIGNER_JOB = 'Дизайнер';

const SEED_USERS = [
  {
    code: 'as',
    name: 'Анна Смирнова',
    job: 'Фронтенд-разработчик',
    email: 'anna@example.com',
    colorIndex: 0,
  },
  {
    code: 'ip',
    name: 'Иван Петров',
    job: 'Бэкенд-разработчик',
    email: 'ivan@example.com',
    colorIndex: 1,
  },
  {
    code: 'do',
    name: 'Дмитрий Орлов',
    job: 'Фронтенд-разработчик',
    email: 'dmitry@example.com',
    colorIndex: 2,
  },
  {
    code: 'mk',
    name: 'Мария Ким',
    job: DESIGNER_JOB,
    email: 'maria@example.com',
    colorIndex: 5,
  },
  {
    code: 'eb',
    name: 'Елена Белова',
    job: TESTER_JOB,
    email: 'elena@example.com',
    colorIndex: 3,
  },
  {
    code: 'sn',
    name: 'Сергей Новиков',
    job: 'Бэкенд-разработчик',
    email: 'sergey@example.com',
    colorIndex: 4,
  },
  {
    code: 'om',
    name: 'Ольга Морозова',
    job: TESTER_JOB,
    email: 'olga@example.com',
    colorIndex: 1,
  },
  {
    code: 'pk',
    name: 'Павел Кузнецов',
    job: 'DevOps-инженер',
    email: 'pavel@example.com',
    colorIndex: 2,
  },
  {
    code: 'vl',
    name: 'Виктория Лебедева',
    job: DESIGNER_JOB,
    email: 'viktoria@example.com',
    colorIndex: 0,
  },
  {
    code: 'ta',
    name: 'Тимур Алиев',
    job: 'Мобильный разработчик',
    email: 'timur@example.com',
    colorIndex: 3,
  },
] as const;

type UserCode = (typeof SEED_USERS)[number]['code'];

interface SeedBoard {
  id: number;
  key: string;
  name: string;
  sprint: number;
  members: UserCode[];
  admins: UserCode[];
  guests: UserCode[];
  colorIndex: number;
  favoriteOfAnna: boolean;
}

const SEED_BOARDS: SeedBoard[] = [
  {
    id: 9,
    key: 'GWT',
    name: 'Разработка',
    sprint: 14,
    members: ['as', 'ip', 'do', 'mk', 'eb', 'vl'],
    admins: ['as', 'ip'],
    guests: ['vl'],
    colorIndex: 0,
    favoriteOfAnna: true,
  },
  {
    id: 11,
    key: 'FRONT',
    name: 'Фронтенд',
    sprint: 9,
    members: ['as', 'do', 'mk', 'om'],
    admins: ['as'],
    guests: [],
    colorIndex: 2,
    favoriteOfAnna: false,
  },
  {
    id: 22,
    key: 'BACK',
    name: 'Бэкенд',
    sprint: 21,
    members: ['ip', 'sn', 'pk', 'om'],
    admins: ['ip'],
    guests: [],
    colorIndex: 1,
    favoriteOfAnna: false,
  },
  {
    id: 30,
    key: 'DES',
    name: 'Дизайн',
    sprint: 6,
    members: ['mk', 'vl', 'as'],
    admins: ['as', 'mk'],
    guests: [],
    colorIndex: 5,
    favoriteOfAnna: false,
  },
  {
    id: 36,
    key: 'MOB',
    name: 'Мобильное приложение',
    sprint: 11,
    members: ['ta', 'as', 'vl', 'om'],
    admins: ['as'],
    guests: [],
    colorIndex: 3,
    favoriteOfAnna: true,
  },
  {
    id: 39,
    key: 'OPS',
    name: 'Инфраструктура',
    sprint: 17,
    members: ['pk', 'sn', 'ip'],
    admins: ['pk'],
    guests: [],
    colorIndex: 4,
    favoriteOfAnna: false,
  },
  {
    id: 41,
    key: 'QA',
    name: 'Автотесты',
    sprint: 12,
    members: ['eb', 'om', 'do'],
    admins: ['eb'],
    guests: [],
    colorIndex: 2,
    favoriteOfAnna: false,
  },
  {
    id: 48,
    key: 'HOT',
    name: 'Срочные и важные',
    sprint: 5,
    members: ['as', 'ip', 'eb', 'pk'],
    admins: ['as'],
    guests: ['pk'],
    colorIndex: 1,
    favoriteOfAnna: false,
  },
];

const SP_POOL = [1, 2, 2, 3, 3, 3, 5, 5, 8];
const PRIORITY_WEIGHTS: [TaskPriority, number][] = [
  ['crit', 0.08],
  ['high', 0.28],
  ['med', 0.44],
  ['low', 0.2],
];

const TITLE_ACTIONS = [
  'Сделать',
  'Починить',
  'Переработать',
  'Проверить',
  'Ускорить',
  'Описать',
  'Добавить',
];
const TITLE_SUBJECTS = [
  'экран входа',
  'фильтр задач',
  'таблицу участников',
  'график сгорания',
  'экспорт отчёта',
  'поиск по доске',
  'карточку задачи',
  'уведомления в меню',
  'загрузку данных',
  'страницу профиля',
  'мобильную вёрстку',
  'обработку ошибок',
];
const COMMENTS = [
  'Посмотрел, вопросов нет.',
  'Нужно уточнить требования у дизайнера.',
  'Взял в работу, к вечеру будет результат.',
  'Есть замечания, оставил в ревью.',
  'Проверил на стенде, всё работает.',
  'Давайте обсудим на созвоне.',
];

type Rng = () => number;

/** Mulberry32: одинаковый seed даёт одинаковые данные при каждом запуске. */
function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rng: Rng, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));
const pick = <T>(rng: Rng, items: readonly T[]) =>
  items[randInt(rng, 0, items.length - 1)] as T;

function randomUuid(rng: Rng): string {
  const hex = Array.from({ length: 32 }, () =>
    randInt(rng, 0, 15).toString(16),
  );
  hex[12] = '4';
  hex[16] = pick(rng, ['8', '9', 'a', 'b']);
  const text = hex.join('');
  return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}`;
}

function pickPriority(rng: Rng): TaskPriority {
  let roll = rng();
  for (const [priority, weight] of PRIORITY_WEIGHTS) {
    roll -= weight;
    if (roll < 0) return priority;
  }
  return 'low';
}

interface GenInterval {
  status: TaskStatus;
  enteredAt: Date;
  leftAt: Date | null;
  pausedSec: number;
}

interface GenTask {
  id: string;
  number: number;
  title: string;
  priority: TaskPriority;
  sp: number;
  authorId: string;
  reviewerId: string;
  testerId: null | string;
  designerId: null | string;
  createdAt: Date;
  sprintId: string;
  intervals: GenInterval[];
  pausedAt: Date | null;
  takeLocked: boolean;
}

const currentStatus = (task: GenTask) =>
  task.intervals.at(-1)?.status as TaskStatus;
const lastEnteredAt = (task: GenTask) =>
  task.intervals.at(-1)?.enteredAt as Date;

const workTime = (rng: Rng, date: IsoDate) =>
  new Date(
    startOfDayInZone(date, TIMEZONE).getTime() +
      (9 * 60 + randInt(rng, 0, 540)) * 60_000,
  );

function advanceTask(
  rng: Rng,
  task: GenTask,
  dates: IsoDate[],
  options: {
    startDay: number;
    lastDay: number;
    now: Date;
    /** Сколько шагов пути можно пройти за этот спринт. */
    maxSteps: number;
    mustFinish: boolean;
  },
) {
  const path: TaskStatus[] = task.testerId
    ? ['todo', 'work', 'review', 'test', 'done']
    : ['todo', 'work', 'review', 'done'];

  let index = path.indexOf(currentStatus(task));
  let day = options.startDay;
  let steps = 0;

  while (index < path.length - 1 && steps < options.maxSteps) {
    day += randInt(rng, 0, 2);
    if (day > options.lastDay) {
      if (!options.mustFinish) break;
      day = options.lastDay;
    }

    let enteredAt = workTime(rng, dates[day] as IsoDate);
    const previous = lastEnteredAt(task);
    if (enteredAt <= previous) {
      enteredAt = new Date(previous.getTime() + randInt(rng, 30, 180) * 60_000);
    }
    if (enteredAt >= options.now) break;

    const open = task.intervals.at(-1) as GenInterval;
    open.leftAt = enteredAt;
    if (rng() < 0.2) {
      const duration = Math.floor(
        (enteredAt.getTime() - open.enteredAt.getTime()) / 1000,
      );
      open.pausedSec = Math.floor(duration * rng() * 0.5);
    }

    index += 1;
    task.intervals.push({
      status: path[index] as TaskStatus,
      enteredAt,
      leftAt: null,
      pausedSec: 0,
    });
    steps += 1;
  }
}

function completedInDays(task: GenTask): null | number {
  if (currentStatus(task) !== 'done') return null;
  const started = task.intervals.find(
    (interval) => interval.status !== 'todo',
  ) as GenInterval;
  return Math.max(
    1,
    countWorkdays(
      dateInZone(started.enteredAt, TIMEZONE),
      dateInZone(lastEnteredAt(task), TIMEZONE),
    ),
  );
}

const toKpiTask = (task: GenTask, addedAt: Date): KpiTask => ({
  sp: task.sp,
  addedAt,
  completedInDays: completedInDays(task),
  authorId: task.authorId,
  reviewerId: task.reviewerId,
  testerId: task.testerId,
  designerId: task.designerId,
  intervals: task.intervals,
});

type UserIds = Record<UserCode, string>;

function resolveTodayIndex(dates: IsoDate[], now: Date): number {
  let today = 0;
  dates.forEach((date, index) => {
    if (startOfDayInZone(date, TIMEZONE) <= now) today = index;
  });
  return today;
}

function generateBoard(board: SeedBoard, userIds: UserIds, now: Date) {
  const rng = createRng(board.id * 2_654_435_761);
  const jobs = new Map<string, string>(
    SEED_USERS.map((user) => [userIds[user.code], user.job]),
  );

  const nonGuests = board.members
    .filter((code) => !board.guests.includes(code))
    .map((code) => userIds[code]);
  const testers = nonGuests.filter((id) => jobs.get(id) === TESTER_JOB);
  const designers = nonGuests.filter((id) => jobs.get(id) === DESIGNER_JOB);
  const developers = nonGuests.filter(
    (id) => !testers.includes(id) && !designers.includes(id),
  );
  const assignees = developers.length >= 2 ? developers : nonGuests;

  const today = dateInZone(now, TIMEZONE);
  const periods = Math.floor(diffDays(today, GRID_ANCHOR) / SPRINT_LENGTH_DAYS);
  const activeStart = addDays(GRID_ANCHOR, periods * SPRINT_LENGTH_DAYS);
  const closedCount = Math.min(MAX_CLOSED_SPRINTS, board.sprint - 1);

  const sprintRows: (typeof sprints.$inferInsert)[] = [];
  const sprintTaskRows: (typeof sprintTasks.$inferInsert)[] = [];
  const allTasks: GenTask[] = [];
  const linkRows: (typeof taskLinks.$inferInsert)[] = [];
  const velocity: VelocityItem[] = [];

  let number = 100;
  let carried: GenTask[] = [];

  for (let age = closedCount; age >= 0; age -= 1) {
    const isClosed = age > 0;
    const sprintNumber = board.sprint - age;
    const startDate = addDays(activeStart, -age * SPRINT_LENGTH_DAYS);
    const dates = sprintWorkdays(startDate);
    const lastDay = isClosed ? LAST_DAY : resolveTodayIndex(dates, now);
    const sprintStart = startOfDayInZone(startDate, TIMEZONE);
    const sprintId = randomUuid(rng);
    const members = [...carried];
    const kpiEntries: { task: GenTask; addedAt: Date }[] = [];

    for (const task of carried) {
      task.sprintId = sprintId;
      sprintTaskRows.push({ sprintId, taskId: task.id, addedAt: sprintStart });
      kpiEntries.push({ task, addedAt: sprintStart });
      advanceTask(rng, task, dates, {
        startDay: 0,
        lastDay,
        now,
        maxSteps: isClosed ? 4 : randInt(rng, 0, 2),
        mustFinish: isClosed && rng() < 0.85,
      });
    }

    const newCount = Math.max(0, randInt(rng, 13, 18) - carried.length);
    const plans = Array.from({ length: newCount }, () => ({
      createdDay:
        rng() < 0.18 && lastDay >= 1
          ? randInt(rng, 1, Math.min(8, lastDay))
          : 0,
    })).sort((a, b) => a.createdDay - b.createdDay);

    const fresh: GenTask[] = [];
    plans.forEach((plan, index) => {
      number += 1;
      const authorId = pick(rng, assignees);
      const reviewers = assignees.filter((id) => id !== authorId);
      const reviewerId = reviewers.length > 0 ? pick(rng, reviewers) : authorId;
      const testerId =
        testers.length > 0 && rng() < 0.65 ? pick(rng, testers) : null;
      const designerId =
        designers.length > 0 && rng() < 0.3 ? pick(rng, designers) : null;

      let createdAt = workTime(rng, dates[plan.createdDay] as IsoDate);
      if (createdAt >= now) createdAt = new Date(now.getTime() - 60_000);

      const task: GenTask = {
        id: randomUuid(rng),
        number,
        title: `${pick(rng, TITLE_ACTIONS)} ${pick(rng, TITLE_SUBJECTS)}`,
        priority: pickPriority(rng),
        sp: pick(rng, SP_POOL),
        authorId,
        reviewerId,
        testerId,
        designerId,
        createdAt,
        sprintId,
        intervals: [
          { status: 'todo', enteredAt: createdAt, leftAt: null, pausedSec: 0 },
        ],
        pausedAt: null,
        takeLocked: false,
      };

      sprintTaskRows.push({ sprintId, taskId: task.id, addedAt: createdAt });
      kpiEntries.push({ task, addedAt: createdAt });

      // Первые задачи активного спринта остаются в todo: на них проверяется запрет брать в работу.
      const staysInTodo = !isClosed && index < 4;
      if (!staysInTodo) {
        const mustFinish = isClosed && rng() < 0.85;
        advanceTask(rng, task, dates, {
          startDay: plan.createdDay,
          lastDay,
          now,
          maxSteps: isClosed && !mustFinish ? randInt(rng, 0, 3) : 4,
          mustFinish,
        });
      }

      fresh.push(task);
      allTasks.push(task);
    });
    members.push(...fresh);

    for (let group = 0; group * 5 + 3 < fresh.length; group += 1) {
      const base = group * 5;
      const [a, b, c, d] = [
        fresh[base],
        fresh[base + 1],
        fresh[base + 2],
        fresh[base + 3],
      ] as GenTask[];
      linkRows.push(
        {
          taskId: (a as GenTask).id,
          targetTaskId: (b as GenTask).id,
          type: 'rel',
        },
        {
          taskId: (b as GenTask).id,
          targetTaskId: (a as GenTask).id,
          type: 'rel',
        },
      );
      if (group % 2 === 0) {
        linkRows.push(
          {
            taskId: (c as GenTask).id,
            targetTaskId: (d as GenTask).id,
            type: 'blocks',
          },
          {
            taskId: (d as GenTask).id,
            targetTaskId: (c as GenTask).id,
            type: 'blockedBy',
          },
        );
      }
    }

    if (isClosed) {
      const snapshot = computeSprintKpi({
        now,
        timezone: TIMEZONE,
        number: sprintNumber,
        startDate,
        isClosed: true,
        tasks: kpiEntries.map(({ task, addedAt }) => toKpiTask(task, addedAt)),
        memberIds: nonGuests,
        previousSprints: velocity.slice(-5),
      });
      velocity.push({
        number: sprintNumber,
        startDate,
        endDate: sprintEndDate(startDate),
        plannedSp: snapshot.summary.committedSp,
        doneSp: snapshot.summary.doneSp,
        isActive: false,
      });
      sprintRows.push({
        id: sprintId,
        boardId: board.id,
        number: sprintNumber,
        startDate,
        endDate: sprintEndDate(startDate),
        state: 'closed',
        plannedSp: snapshot.summary.committedSp,
        doneSp: snapshot.summary.doneSp,
        kpiSnapshot: snapshot,
        createdAt: sprintStart,
      });
      carried = members.filter((task) => currentStatus(task) !== 'done');
    } else {
      sprintRows.push({
        id: sprintId,
        boardId: board.id,
        number: sprintNumber,
        startDate,
        endDate: sprintEndDate(startDate),
        state: 'active',
        createdAt: sprintStart,
      });

      const inWork = members.filter((task) => currentStatus(task) === 'work');
      for (const task of inWork) {
        if (rng() >= 0.25) continue;
        const entered = lastEnteredAt(task).getTime();
        task.pausedAt = new Date(
          entered + Math.floor((now.getTime() - entered) / 2),
        );
      }

      members
        .filter((task) => currentStatus(task) === 'todo')
        .sort((a, b) => a.number - b.number)
        .forEach((task, index) => {
          if (index % 3 === 0) task.takeLocked = true;
        });
    }
  }

  const commentRows = allTasks.flatMap((task) => {
    if (rng() >= 0.5) return [];
    const open = lastEnteredAt(task).getTime();
    const createdAt = new Date(
      Math.min(open + randInt(rng, 5, 240) * 60_000, now.getTime()),
    );
    return [
      {
        taskId: task.id,
        authorId: pick(rng, nonGuests),
        text: pick(rng, COMMENTS),
        createdAt,
      },
    ];
  });

  return {
    sprintRows,
    sprintTaskRows,
    linkRows: linkRows.map((row) => ({ ...row, createdAt: now })),
    commentRows,
    allTasks,
    lastNumber: number,
    firstSprintStart: startOfDayInZone(
      addDays(activeStart, -closedCount * SPRINT_LENGTH_DAYS),
      TIMEZONE,
    ),
  };
}

async function insertChunked<T>(
  items: T[],
  insert: (chunk: T[]) => Promise<unknown>,
) {
  for (let offset = 0; offset < items.length; offset += INSERT_CHUNK) {
    await insert(items.slice(offset, offset + INSERT_CHUNK));
  }
}

async function deleteSeedBoards(tx: Db) {
  const ids = SEED_BOARDS.map((board) => board.id);
  const keys = SEED_BOARDS.map((board) => board.key);
  const existing = await tx
    .select({ id: boards.id })
    .from(boards)
    .where(or(inArray(boards.id, ids), inArray(boards.key, keys)));
  const boardIds = existing.map((row) => row.id);
  if (boardIds.length === 0) return;

  const taskRows = await tx
    .select({ id: tasks.id })
    .from(tasks)
    .where(inArray(tasks.boardId, boardIds));
  const taskIds = taskRows.map((row) => row.id);

  if (taskIds.length > 0) {
    await tx.delete(taskComments).where(inArray(taskComments.taskId, taskIds));
    await tx
      .delete(taskLinks)
      .where(
        or(
          inArray(taskLinks.taskId, taskIds),
          inArray(taskLinks.targetTaskId, taskIds),
        ),
      );
    await tx
      .delete(taskStatusIntervals)
      .where(inArray(taskStatusIntervals.taskId, taskIds));
    await tx.delete(sprintTasks).where(inArray(sprintTasks.taskId, taskIds));
    await tx.delete(tasks).where(inArray(tasks.id, taskIds));
  }
  await tx.delete(sprints).where(inArray(sprints.boardId, boardIds));
  await tx
    .delete(boardFavorites)
    .where(inArray(boardFavorites.boardId, boardIds));
  await tx.delete(boardMembers).where(inArray(boardMembers.boardId, boardIds));
  await tx.delete(boards).where(inArray(boards.id, boardIds));
}

export function assertSeedAllowed(nodeEnv: string | undefined) {
  if (nodeEnv === 'production') {
    throw new Error(
      'Сид запрещён при NODE_ENV=production: он создаёт аккаунты с известным паролем',
    );
  }
}

export async function seedDatabase(tx: Db, now: Date, passwordHash: string) {
  const userIds = {} as UserIds;
  for (const user of SEED_USERS) {
    const { code, ...values } = user;
    const [row] = await tx
      .insert(users)
      .values({
        ...values,
        passwordHash,
        termsAcceptedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: values.name,
          job: values.job,
          colorIndex: values.colorIndex,
          passwordHash,
          updatedAt: now,
        },
      })
      .returning({ id: users.id });
    if (!row) throw new Error(`user ${user.email} was not created`);
    userIds[code] = row.id;
  }

  await deleteSeedBoards(tx);

  for (const board of SEED_BOARDS) {
    const generated = generateBoard(board, userIds, now);
    const creator = userIds[board.admins[0] as UserCode];
    const lastAddedAt = (index: number) =>
      new Date(generated.firstSprintStart.getTime() + index * 60_000);

    await tx.insert(boards).values({
      id: board.id,
      key: board.key,
      name: board.name,
      colorIndex: board.colorIndex,
      timezone: TIMEZONE,
      taskSeq: generated.lastNumber,
      createdBy: creator,
      createdAt: generated.firstSprintStart,
    });

    await tx.insert(boardMembers).values(
      board.members.map((code, index) => {
        let role: BoardRole = 'worker';
        if (board.admins.includes(code)) role = 'admin';
        else if (board.guests.includes(code)) role = 'guest';
        return {
          boardId: board.id,
          userId: userIds[code],
          role,
          addedAt: lastAddedAt(index),
          addedBy: creator,
        };
      }),
    );

    if (board.favoriteOfAnna) {
      await tx
        .insert(boardFavorites)
        .values({ userId: userIds.as, boardId: board.id, createdAt: now });
    }

    await insertChunked(generated.sprintRows, (chunk) =>
      tx.insert(sprints).values(chunk),
    );
    await insertChunked(generated.allTasks, (chunk) =>
      tx.insert(tasks).values(
        chunk.map((task) => ({
          id: task.id,
          boardId: board.id,
          number: task.number,
          key: `${board.key}-${task.number}`,
          sprintId: task.sprintId,
          title: task.title,
          priority: task.priority,
          sp: task.sp,
          status: currentStatus(task),
          authorId: task.authorId,
          reviewerId: task.reviewerId,
          testerId: task.testerId,
          designerId: task.designerId,
          createdBy: task.authorId,
          statusEnteredAt: lastEnteredAt(task),
          pausedAt: task.pausedAt,
          completedInDays: completedInDays(task),
          takeLocked: task.takeLocked,
          createdAt: task.createdAt,
          updatedAt: lastEnteredAt(task),
        })),
      ),
    );
    await insertChunked(generated.sprintTaskRows, (chunk) =>
      tx.insert(sprintTasks).values(chunk),
    );
    await insertChunked(
      generated.allTasks.flatMap((task) =>
        task.intervals.map((interval) => ({
          taskId: task.id,
          status: interval.status,
          enteredAt: interval.enteredAt,
          leftAt: interval.leftAt,
          pausedSec: interval.pausedSec,
          changedBy: task.authorId,
        })),
      ),
      (chunk) => tx.insert(taskStatusIntervals).values(chunk),
    );
    await insertChunked(generated.linkRows, (chunk) =>
      tx.insert(taskLinks).values(chunk),
    );
    await insertChunked(generated.commentRows, (chunk) =>
      tx.insert(taskComments).values(chunk),
    );
  }

  await tx.execute(
    sql`select setval(pg_get_serial_sequence('boards', 'id'), (select max(id) from boards))`,
  );
}

async function main() {
  if (existsSync('.env')) process.loadEnvFile('.env');
  assertSeedAllowed(process.env.NODE_ENV);

  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString)
    throw new Error('Не задана переменная DATABASE_URL_UNPOOLED');

  const passwordHash = await hashPassword('password');
  const pool = new Pool({ connectionString });
  try {
    await drizzle({ client: pool, schema }).transaction((tx) =>
      seedDatabase(tx, new Date(), passwordHash),
    );
    console.log('Сид применён');
  } finally {
    await pool.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
