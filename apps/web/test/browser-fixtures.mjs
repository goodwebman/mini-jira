export const DEMO_NOW = '2026-11-23T10:00:00.000Z';

const sprintStart = '2026-11-16T08:00:00.000Z';
const MS_PER_HOUR = 3_600_000;
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
    ['Дмитрий Константинопольский', 'Backend-разработчик'],
    ['Мария Кузнецова', 'QA-инженер'],
    ['Виктория Семёнова', 'Продуктовый дизайнер'],
    ['Алексей Павлов', 'Frontend-разработчик'],
  ].map(([name, job], index) => ({
    ...user,
    id: `user-${index + 2}`,
    email: `member-${index + 2}@example.test`,
    name,
    job,
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
  description: 'Оплата, возвраты и история операций в личном кабинете.',
  timezone: user.timezone,
  currentSprint: sprint,
  members: people.map((person, i) => ({
    ...person,
    role: i === 0 ? 'admin' : 'worker',
    addedAt: sprintStart,
  })),
};
const boardList = [
  listItem,
  ...[
    ['MOB', 'Мобильное приложение', 'worker', 8, 9],
    ['INT', 'Интеграции с партнёрами', 'worker', 6, 6],
    ['SUP', 'Поддержка клиентов', 'guest', 5, 4],
    ['OPS', 'Внутренние инструменты', 'admin', 4, 17],
    ['BIL', 'Биллинг и подписки', 'worker', 5, 8],
    ['DWH', 'Качество данных', 'guest', 3, 5],
  ].map(([key, name, myRole, memberCount, currentSprintNumber], index) => ({
    id: index + 2,
    key,
    name,
    myRole,
    memberCount,
    currentSprintNumber,
    colorIndex: (index + 1) % 6,
    isFavorite: index === 0,
    membersPreview: Array.from(
      { length: Math.min(4, memberCount) },
      (_, offset) => people[(index + offset + 1) % people.length],
    ),
  })),
];
const tasks = [
  [
    'Проверить сценарий повторной оплаты после отклонения операции',
    'todo',
    'crit',
    3,
    82,
    240,
  ],
  ['Обновить список способов оплаты', 'work', 'high', 5, 2, 90],
  ['Согласовать уведомления о возврате', 'review', 'med', 2, 1, 30],
  ['Проверить оплату с сохранённой карты', 'test', 'low', 2, 0.75, 30],
  ['Обновить историю выписок', 'done', 'med', 5, 8, 360],
  ['Добавить фильтр по типу операции', 'todo', 'high', 2, 36, 0],
  ['Настроить частичный возврат', 'work', 'med', 5, 6, 45],
  ['Вынести настройки чеков в личный кабинет', 'review', 'low', 2, 1, 120],
  ['Проверить выгрузку операций в CSV', 'test', 'high', 1, 2, 5],
  ['Сократить время загрузки списка карт', 'done', 'high', 3, 24, 120],
  ['Уточнить тексты ошибок банка', 'todo', 'med', 3, 18, 0],
  ['Добавить журнал событий оплаты', 'work', 'low', 2, 1, 10],
  ['Подготовить отчёт по возвратам', 'review', 'med', 1, 2, 30],
  ['Проверить оплату со скидкой', 'test', 'low', 1, 0.5, 3],
  ['Включить быстрые платежи для пилота', 'done', 'crit', 5, 38, 180],
].map(([title, status, priority, sp, hoursInStatus, spentMinutes], i) => {
  return {
    id: `task-${i + 1}`,
    key: `PAY-${101 + i}`,
    boardId: 1,
    sprintId: sprint.id,
    title,
    status,
    priority,
    sp,
    createdAt: sprintStart,
    timer: {
      spentSec: spentMinutes * 60,
      statusEnteredAt: new Date(
        Date.parse(DEMO_NOW) - hoursInStatus * MS_PER_HOUR,
      ).toISOString(),
      pausedAt: i === 6 ? '2026-11-23T06:00:00.000Z' : null,
      pausedTotalSec: i === 6 ? 1800 : 0,
      canPause: status !== 'done' && status !== 'todo',
      completedInDays: status === 'done' ? 2 + (i % 3) : null,
    },
    linkCount: i === 0 ? 1 : 0,
    isBlocked: false,
    isTakeLocked: false,
    people: {
      author: people[[0, 4, 1][i % 3]],
      reviewer: people[[1, 0, 4][i % 3]],
      tester: [people[2], null, user][i % 3],
      designer: [people[3], null, null, user][i % 4],
    },
  };
});
export const demoTask = {
  ...tasks[0],
  board: boardRef,
  sprint,
  myRole: 'admin',
  serverTime: DEMO_NOW,
  assigneeOptions: people,
  description: `Если банк отклонил первую попытку, пользователь должен суметь повторить оплату с той же страницы. Сумма заказа и выбранный способ оплаты сохраняются.

После успешной попытки показываем чек, обновляем историю операций и убеждаемся, что деньги списались один раз.`,
  timeHistory: [
    {
      id: 'interval-1',
      status: 'work',
      enteredAt: '2026-11-19T10:00:00.000Z',
      leftAt: '2026-11-19T14:00:00.000Z',
      pausedSec: 0,
      changedBy: people[1],
      pauses: [],
    },
    {
      id: 'interval-2',
      status: 'todo',
      enteredAt: tasks[0].timer.statusEnteredAt,
      leftAt: null,
      pausedSec: 0,
      changedBy: user,
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
      text: 'На тестовом стенде первая попытка отклоняется, повторная проходит. В истории остаётся одно успешное списание.',
      createdAt: '2026-11-23T08:10:00.000Z',
    },
    {
      id: 'comment-2',
      parentId: 'comment-1',
      author: user,
      text: 'Спасибо! Проверю этот же сценарий на мобильном и приложу результаты к задаче.',
      createdAt: '2026-11-23T09:05:00.000Z',
    },
  ],
};
const counts = { todo: 8, work: 12, review: 5, test: 4, done: 13 };
const flow = [
  { todo: 28, work: 8, review: 0, test: 0, done: 0 },
  { todo: 23, work: 8, review: 2, test: 0, done: 3 },
  { todo: 20, work: 9, review: 3, test: 1, done: 5 },
  { todo: 15, work: 9, review: 4, test: 2, done: 8 },
  { todo: 12, work: 11, review: 6, test: 3, done: 10 },
  counts,
];
const kpi = {
  serverTime: DEMO_NOW,
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
  days: [16, 17, 18, 19, 20, 23, 24, 25, 26, 27].map((day, i) => {
    const point = flow[i];
    const scopeSp = point
      ? Object.values(point).reduce((a, b) => a + b, 0)
      : null;
    return {
      index: i,
      date: `2026-11-${day}`,
      isPast: Boolean(point),
      idealRemainingSp: Math.round(36 * (1 - i / 9)),
      scopeSp,
      doneSp: point?.done ?? null,
      remainingSp: point ? scopeSp - point.done : null,
      addedSp: point ? [0, 0, 2, 0, 4, 0][i] : null,
      closedSp: point ? point.done - (flow[i - 1]?.done ?? 0) : null,
      flow: point ?? null,
    };
  }),
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
    doneSp: [5, 3, 2, 1, 2][index],
    testsCount: index,
    reviewsCount: index + 2,
  })),
};
const statusCounts = Object.fromEntries(
  Object.keys(counts).map((status) => [
    status,
    tasks.filter((item) => item.status === status).length,
  ]),
);
const taskRows = tasks.map((item) => ({
  ...item,
  board: boardRef,
  roles: Object.entries(item.people)
    .filter(([, person]) => person?.id === user.id)
    .map(([role]) => role),
}));

export async function mockBrowserApi(
  context,
  { authenticated = true, task = demoTask, now = Date.now() } = {},
) {
  const unmatched = [];
  const favorites = new Set(
    boardList.filter((item) => item.isFavorite).map((item) => item.id),
  );
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.slice('/api/v1'.length);
    const method = request.method();
    if (method === 'GET' && path.endsWith('/events')) {
      return route.fulfill({
        contentType: 'text/event-stream',
        body: ': ready\n\n',
      });
    }
    if (method === 'POST' && path === '/auth/refresh') {
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
          exp: Math.floor(now / 1000) + 3600,
        }),
      ).toString('base64url');
      return route.fulfill({
        json: {
          user,
          accessToken: `eyJhbGciOiJub25lIn0.${payload}.fixture`,
          accessTokenExpiresAt: new Date(now + MS_PER_HOUR).toISOString(),
        },
      });
    }

    const favoritePath = /^\/boards\/(\d+)\/favorite$/.exec(path);
    if (favoritePath && (method === 'PUT' || method === 'DELETE')) {
      const id = Number(favoritePath[1]);
      if (!boardList.some((item) => item.id === id))
        return route.fulfill({ status: 404 });
      if (method === 'PUT') favorites.add(id);
      else favorites.delete(id);
      return route.fulfill({ status: 204 });
    }

    const query = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const boards = boardList
      .map((item) => ({ ...item, isFavorite: favorites.has(item.id) }))
      .filter(
        (item) =>
          (url.searchParams.get('filter') !== 'favorite' || item.isFavorite) &&
          (item.name.toLowerCase().includes(query) ||
            item.key.toLowerCase().includes(query)),
      );
    const responses = {
      '/me': user,
      '/me/nav-summary': {
        boardsTotal: boardList.length,
        board: { ...boardRef, sprintNumber: 12, statusCounts },
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
        items: taskRows,
        summary: { totalCount: 120, totalSp: 302 },
        total: 120,
        page: Number(url.searchParams.get('page') ?? 1),
        pageSize: Number(url.searchParams.get('pageSize') ?? 50),
        serverTime: DEMO_NOW,
      },
      '/boards': { items: boards, total: boards.length },
      '/boards/1': { ...board, isFavorite: favorites.has(board.id) },
      '/boards/1/tasks': { sprint, items: tasks, serverTime: DEMO_NOW },
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
            createdAt: DEMO_NOW,
            readAt: null,
          },
        ],
        total: 1,
        unreadCount: 1,
        page: 1,
        pageSize: 20,
      },
    };
    if (method !== 'GET' || !Object.hasOwn(responses, path)) {
      const call = `${method} ${path}`;
      unmatched.push(call);
      return route.fulfill({ status: 501, json: { unexpectedRequest: call } });
    }
    return route.fulfill({ json: responses[path] });
  });
  return unmatched;
}
