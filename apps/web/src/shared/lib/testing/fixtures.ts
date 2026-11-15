import type {
  BoardDetail,
  BoardListItem,
  BoardMember,
  BoardTasksResponse,
  Me,
  MyTasksResponse,
  NavSummary,
  SprintBrief,
  SprintKpi,
  TaskCard,
  TaskDetail,
  TaskRow,
  UserBrief,
} from '@gwmt/contracts';

/**
 * Фикстуры проходят zod-схемы контрактов: фетчеры парсят ответы,
 * поэтому невалидная фикстура сломала бы тест раньше проверяемой логики.
 */
export const NOW = '2026-11-06T09:00:00.000Z';
const CREATED_AT = '2026-11-03T08:00:00.000Z';
const ADDED_AT = '2026-10-01T08:00:00.000Z';
const BOARD_NAME = 'Разработка';

export const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const users = {
  anna: {
    id: uuid(1),
    name: 'Анна Смирнова',
    job: 'Фронтенд-разработчик',
    colorIndex: 0,
  },
  ivan: {
    id: uuid(2),
    name: 'Иван Петров',
    job: 'Бэкенд-разработчик',
    colorIndex: 1,
  },
  dmitry: {
    id: uuid(3),
    name: 'Дмитрий Орлов',
    job: 'Фронтенд-разработчик',
    colorIndex: 2,
  },
  elena: {
    id: uuid(4),
    name: 'Елена Белова',
    job: 'Тестировщик',
    colorIndex: 3,
  },
  viktoria: {
    id: uuid(5),
    name: 'Виктория Лебедева',
    job: 'Дизайнер',
    colorIndex: 4,
  },
} satisfies Record<string, UserBrief>;

export function makeUser(overrides: Partial<UserBrief> = {}): UserBrief {
  return { ...users.anna, ...overrides };
}

export function makeMe(overrides: Partial<Me> = {}): Me {
  return {
    ...users.anna,
    email: 'anna@example.com',
    timezone: 'Europe/Moscow',
    hasPassword: true,
    hasGithub: false,
    hasGoogle: false,
    ...overrides,
  };
}

export function makeSprint(overrides: Partial<SprintBrief> = {}): SprintBrief {
  return {
    id: 'sprint-14',
    number: 14,
    state: 'active',
    startDate: '2026-11-02',
    endDate: '2026-11-13',
    ...overrides,
  };
}

export function makeMember(
  user: UserBrief,
  role: BoardMember['role'] = 'worker',
): BoardMember {
  return { ...user, email: `${user.id}@example.com`, role, addedAt: ADDED_AT };
}

export function makeBoard(overrides: Partial<BoardDetail> = {}): BoardDetail {
  return {
    id: 9,
    key: 'GWT',
    name: BOARD_NAME,
    description: '',
    colorIndex: 0,
    timezone: 'Europe/Moscow',
    isFavorite: false,
    myRole: 'admin',
    members: [
      makeMember(users.anna, 'admin'),
      makeMember(users.ivan, 'worker'),
      makeMember(users.elena, 'worker'),
      makeMember(users.viktoria, 'guest'),
    ],
    currentSprint: makeSprint(),
    ...overrides,
  };
}

export function makeBoardListItem(
  overrides: Partial<BoardListItem> = {},
): BoardListItem {
  return {
    id: 9,
    key: 'GWT',
    name: BOARD_NAME,
    colorIndex: 0,
    isFavorite: false,
    memberCount: 4,
    myRole: 'admin',
    membersPreview: [users.anna, users.ivan],
    currentSprintNumber: 14,
    ...overrides,
  };
}

let taskSeq = 100;

export function makeTask(overrides: Partial<TaskCard> = {}): TaskCard {
  taskSeq += 1;
  const status = overrides.status ?? 'todo';
  return {
    id: `task-${String(taskSeq)}`,
    key: `GWT-${String(taskSeq)}`,
    boardId: 9,
    sprintId: 'sprint-14',
    title: `Задача ${String(taskSeq)}`,
    status,
    priority: 'med',
    sp: 3,
    createdAt: CREATED_AT,
    timer: {
      spentSec: 0,
      statusEnteredAt: CREATED_AT,
      pausedAt: null,
      pausedTotalSec: 0,
      canPause: ['review', 'test', 'work'].includes(status),
      completedInDays: status === 'done' ? 2 : null,
    },
    linkCount: 0,
    isBlocked: false,
    isTakeLocked: false,
    people: {
      author: users.anna,
      reviewer: users.ivan,
      tester: null,
      designer: null,
    },
    ...overrides,
  };
}

export function makeBoardTasks(
  items: TaskCard[],
  overrides: Partial<BoardTasksResponse> = {},
): BoardTasksResponse {
  return { sprint: makeSprint(), items, serverTime: NOW, ...overrides };
}

export function makeTaskDetail(
  overrides: Partial<TaskDetail> = {},
): TaskDetail {
  const card = makeTask(overrides);
  return {
    ...card,
    description: 'Описание задачи',
    board: { id: 9, key: 'GWT', name: BOARD_NAME },
    sprint: makeSprint(),
    myRole: 'admin',
    links: [],
    comments: [],
    timeHistory: [],
    assigneeOptions: [users.anna, users.ivan, users.elena],
    serverTime: NOW,
    ...overrides,
  };
}

export function makeTaskRow(overrides: Partial<TaskRow> = {}): TaskRow {
  const card = makeTask(overrides.status ? { status: overrides.status } : {});
  return {
    id: card.id,
    key: card.key,
    title: card.title,
    board: { id: 9, name: BOARD_NAME },
    roles: ['author'],
    status: card.status,
    priority: card.priority,
    sp: card.sp,
    createdAt: card.createdAt,
    timer: card.timer,
    ...overrides,
  };
}

export function makeMyTasks(
  items: TaskRow[],
  overrides: Partial<MyTasksResponse> = {},
): MyTasksResponse {
  return {
    items,
    page: 1,
    pageSize: 50,
    total: items.length,
    summary: {
      totalCount: items.length,
      totalSp: items.reduce((sum, row) => sum + row.sp, 0),
    },
    serverTime: NOW,
    ...overrides,
  };
}

export function makeNavSummary(
  overrides: Partial<NavSummary> = {},
): NavSummary {
  return {
    boardsTotal: 3,
    board: {
      id: 9,
      name: BOARD_NAME,
      sprintNumber: 14,
      statusCounts: { todo: 2, work: 3, review: 1, test: 0, done: 4 },
    },
    myTasks: {
      openCount: 5,
      openSp: 13,
      next: [{ key: 'GWT-101', title: 'Панель свойств' }],
    },
    kpi: { sprintNumber: 14, donePct: 42, remaining: [30, 26, 22] },
    ...overrides,
  };
}

const ZERO_FLOW = { todo: 0, work: 0, review: 0, test: 0, done: 0 };

export function makeSprintKpi(overrides: Partial<SprintKpi> = {}): SprintKpi {
  const scope = 30;
  const doneByDay = [0, 2, 5, 8, 10];
  // На 4-й день (index 3) в спринт добавили задачу на 3 SP
  const days: SprintKpi['days'] = Array.from({ length: 10 }, (_, index) => {
    const date = `2026-11-${String(2 + index + (index >= 5 ? 2 : 0)).padStart(2, '0')}`;
    const idealRemainingSp = Math.round(scope * (1 - index / 9) * 10) / 10;
    const done = doneByDay[index];
    if (done === undefined)
      return {
        index,
        date,
        isPast: false,
        idealRemainingSp,
        scopeSp: null,
        doneSp: null,
        remainingSp: null,
        addedSp: null,
        closedSp: null,
        flow: null,
      };
    const scopeSp = index >= 3 ? scope + 3 : scope;
    return {
      index,
      date,
      isPast: true,
      idealRemainingSp,
      scopeSp,
      doneSp: done,
      remainingSp: scopeSp - done,
      addedSp: index === 3 ? 3 : 0,
      closedSp: done,
      flow: { ...ZERO_FLOW, todo: 10, work: 8, done },
    };
  });
  return {
    serverTime: NOW,
    board: { id: 9, key: 'GWT', name: BOARD_NAME, colorIndex: 0 },
    sprint: { ...makeSprint(), todayIndex: 4, dayNumber: 5, totalDays: 10 },
    isEmpty: false,
    summary: {
      scopeSp: 33,
      doneSp: 10,
      donePct: 30,
      committedSp: 30,
      addedSp: 3,
      addedCount: 1,
      paceSpPerDay: 2,
      forecastDoneSp: 20,
      forecastRemainingSp: 13,
      medianCycleDays: 2.5,
    },
    days,
    byStatus: { todo: 10, work: 8, review: 3, test: 2, done: 10 },
    stages: [
      { status: 'work', avgDays: 2.5 },
      { status: 'review', avgDays: 1 },
      { status: 'test', avgDays: 0.5 },
    ],
    slowestStage: 'work',
    velocity: {
      items: [
        {
          number: 12,
          startDate: '2026-10-05',
          endDate: '2026-10-16',
          plannedSp: 28,
          doneSp: 25,
          isActive: false,
        },
        {
          number: 13,
          startDate: '2026-10-19',
          endDate: '2026-10-30',
          plannedSp: 30,
          doneSp: 31,
          isActive: false,
        },
        {
          number: 14,
          startDate: '2026-11-02',
          endDate: '2026-11-13',
          plannedSp: 30,
          doneSp: 10,
          isActive: true,
        },
      ],
      averageDoneSp: 28,
    },
    team: [
      { user: users.anna, doneSp: 6, reviewsCount: 2, testsCount: 0 },
      { user: users.ivan, doneSp: 4, reviewsCount: 1, testsCount: 1 },
    ],
    ...overrides,
  };
}
