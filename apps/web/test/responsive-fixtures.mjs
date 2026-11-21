const date = '2026-11-18T10:00:00.000Z';
const user = {
  id: 'user-1',
  name: 'Александра Воронцова',
  email: 'alexandra@example.test',
  job: 'Руководитель команды разработки',
  colorIndex: 0,
  timezone: 'Asia/Novosibirsk',
  hasPassword: true,
  hasGithub: false,
  hasGoogle: false,
};
const people = [
  user,
  ...[
    'Дмитрий Константинопольский',
    'Мария Кузнецова',
    'Виктория Семёнова',
    'Алексей Павлов',
  ].map((name, index) => ({
    ...user,
    id: `user-${index + 2}`,
    email: `member-${index + 2}@example.test`,
    name,
    colorIndex: index + 1,
  })),
];
const sprint = {
  id: 'sprint-12',
  number: 12,
  state: 'active',
  startDate: '2026-11-16',
  endDate: '2026-11-27',
};
const boardRef = {
  id: 1,
  key: 'PAY',
  name: 'Платёжная платформа и личный кабинет',
};
const listItem = {
  ...boardRef,
  colorIndex: 0,
  isFavorite: true,
  memberCount: people.length,
  myRole: 'admin',
  membersPreview: people.slice(0, 4),
  currentSprintNumber: 12,
};
const board = {
  ...listItem,
  description: 'Задачи команды платёжной платформы',
  timezone: user.timezone,
  currentSprint: sprint,
  members: people.map((person, i) => ({
    ...person,
    role: i === 0 ? 'admin' : 'worker',
    addedAt: date,
  })),
};
const tasks = Array.from({ length: 15 }, (_, i) => {
  const status = ['todo', 'work', 'review', 'test', 'done'][i % 5];
  return {
    id: `task-${i + 1}`,
    key: `PAY-${101 + i}`,
    boardId: 1,
    sprintId: sprint.id,
    title: [
      'Проверить сценарий повторной оплаты после отклонения операции',
      'Обновить список способов оплаты',
      'Согласовать уведомления о возврате',
      'Добавить проверку адреса плательщика',
      'Обновить историю выписок',
    ][i % 5],
    status,
    priority: ['crit', 'high', 'med', 'low'][i % 4],
    sp: (i % 5) + 1,
    createdAt: date,
    timer: {
      spentSec: 3600,
      statusEnteredAt: date,
      pausedAt: null,
      pausedTotalSec: 0,
      canPause: status !== 'done' && status !== 'todo',
      completedInDays: status === 'done' ? 3 : null,
    },
    linkCount: i === 0 ? 1 : 0,
    isBlocked: false,
    isTakeLocked: false,
    people: {
      author: user,
      reviewer: people[1],
      tester: people[2],
      designer: people[3],
    },
  };
});
const unbroken = 'подтверждениеплатёжнойоперации'.repeat(6);
const task = {
  ...tasks[0],
  board: boardRef,
  sprint,
  myRole: 'admin',
  serverTime: date,
  assigneeOptions: people,
  description: `Проверить списание и отобразить результат в истории операций.\n${unbroken}`,
  timeHistory: [
    {
      id: 'interval-1',
      status: 'work',
      enteredAt: date,
      leftAt: null,
      pausedSec: 0,
      changedBy: people[1],
      pauses: [],
    },
  ],
  links: [
    {
      type: 'rel',
      task: {
        key: tasks[1].key,
        title: tasks[1].title,
        status: tasks[1].status,
        boardName: board.name,
        canOpen: true,
      },
    },
  ],
  comments: [
    {
      id: 'comment-1',
      parentId: null,
      author: people[1],
      text: `Сценарий проверен на тестовой операции. ${unbroken}`,
      createdAt: date,
    },
    {
      id: 'comment-2',
      parentId: 'comment-1',
      author: user,
      text: 'Спасибо, проверю ещё раз на мобильном.',
      createdAt: date,
    },
  ],
};
const counts = { todo: 8, work: 12, review: 5, test: 4, done: 13 };
const kpi = {
  serverTime: date,
  board: listItem,
  sprint: { ...sprint, todayIndex: 5, dayNumber: 6, totalDays: 10 },
  isEmpty: false,
  summary: {
    scopeSp: 42,
    doneSp: 13,
    donePct: 31,
    committedSp: 36,
    addedSp: 6,
    addedCount: 2,
    paceSpPerDay: 2.6,
    forecastDoneSp: 26,
    forecastRemainingSp: 16,
    medianCycleDays: 3.2,
  },
  days: Array.from({ length: 10 }, (_, i) => ({
    index: i,
    date: `2026-11-${16 + i}`,
    isPast: i < 6,
    idealRemainingSp: 42 - i * 4.2,
    scopeSp: i < 6 ? 42 : null,
    doneSp: i < 6 ? i * 2.6 : null,
    remainingSp: i < 6 ? 42 - i * 2.6 : null,
    addedSp: i < 6 ? i % 3 : null,
    closedSp: i < 6 ? i % 4 : null,
    flow: i < 6 ? counts : null,
  })),
  byStatus: counts,
  stages: [
    { status: 'work', avgDays: 2 },
    { status: 'review', avgDays: 3 },
    { status: 'test', avgDays: 1 },
  ],
  slowestStage: 'review',
  velocity: {
    items: [9, 10, 11, 12].map((number) => ({
      ...sprint,
      number,
      plannedSp: 38 + number,
      doneSp: number === 12 ? 13 : 28 + number,
      isActive: number === 12,
    })),
    averageDoneSp: 38,
  },
  team: people.map((person, index) => ({
    user: person,
    doneSp: 8 - index,
    testsCount: index,
    reviewsCount: index + 2,
  })),
};

export async function mockResponsiveApi(context, authenticated) {
  await context.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.slice('/api/v1'.length);
    if (path.endsWith('/events')) {
      return route.fulfill({
        contentType: 'text/event-stream',
        body: ': ready\n\n',
      });
    }
    if (path === '/auth/refresh') {
      if (!authenticated)
        return route.fulfill({
          status: 401,
          json: {
            error: { code: 'UNAUTHORIZED', message: 'Session required' },
          },
        });
      const payload = Buffer.from(
        JSON.stringify({
          sub: user.id,
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString('base64url');
      return route.fulfill({
        json: {
          user,
          accessToken: `eyJhbGciOiJub25lIn0.${payload}.fixture`,
          accessTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      });
    }

    const responses = {
      '/me': user,
      '/me/nav-summary': {
        boardsTotal: 7,
        board: { ...boardRef, sprintNumber: 12, statusCounts: counts },
        myTasks: { openCount: 12, openSp: 23, next: tasks.slice(0, 3) },
        kpi: { sprintNumber: 12, donePct: 31, remaining: [42, 40, 40, 32, 29] },
      },
      '/me/task-stats': {
        open: 12,
        closed: 18,
        totalSp: 42,
        nextOpen: tasks.slice(0, 4),
      },
      '/me/tasks': {
        items: tasks.map((item) => ({
          ...item,
          board: boardRef,
          roles: ['author', 'designer'],
        })),
        summary: { totalCount: 120, totalSp: 302 },
        total: 120,
        page: Number(url.searchParams.get('page') ?? 1),
        pageSize: Number(url.searchParams.get('pageSize') ?? 50),
        serverTime: date,
      },
      '/boards': {
        items: [
          listItem,
          ...[
            'Мобильное приложение',
            'Интеграции с партнёрами',
            'Поддержка',
            'Внутренние инструменты',
            'Биллинг',
            'Качество данных',
          ].map((name, i) => ({
            ...listItem,
            id: i + 2,
            key: `WK${i + 2}`,
            name,
            colorIndex: i + 1,
            isFavorite: false,
          })),
        ],
        total: 7,
      },
      '/boards/1': board,
      '/boards/1/tasks': { sprint, items: tasks, serverTime: date },
      '/boards/1/sprints': {
        items: [
          { ...sprint, doneSp: 13, scopeSp: 42 },
          {
            ...sprint,
            id: 'sprint-11',
            number: 11,
            state: 'closed',
            doneSp: 35,
            scopeSp: 40,
          },
        ],
      },
      '/boards/1/sprints/12/kpi': kpi,
      '/tasks/PAY-101': task,
      '/tasks/search': {
        items: tasks.slice(0, 5).map((item) => ({ ...item, board: boardRef })),
      },
      '/users/search': { items: people.slice(1) },
      '/notifications': {
        items: [
          {
            id: '06efdd87-959d-405f-b329-f9a28197d916',
            type: 'task_assigned',
            boardId: 1,
            boardName: board.name,
            taskKey: task.key,
            createdAt: date,
            readAt: null,
          },
        ],
        total: 1,
        unreadCount: 1,
        page: 1,
        pageSize: 20,
      },
    };
    if (!Object.hasOwn(responses, path))
      throw new Error(`Unexpected responsive fixture request ${path}`);
    return route.fulfill({ json: responses[path] });
  });
}
