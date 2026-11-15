/**
 * Все адреса приложения. `path` — шаблон для роутера (дочерние пути относительные),
 * `build` — готовая ссылка. Строки адресов больше нигде не пишутся.
 */
export const ROUTES = {
  ROOT: { path: '/', build: () => '/' },
  LOGIN: { path: '/login', build: () => '/login' },
  REGISTER: { path: '/register', build: () => '/register' },
  BOARDS: { path: '/boards', build: () => '/boards' },
  BOARD: {
    path: '/boards/:boardId',
    build: (boardId: number) => `/boards/${String(boardId)}`,
  },
  /** Дочерний к BOARD: живёт в скоупе доски. */
  BOARD_MEMBERS: {
    path: 'members',
    build: (boardId: number) => `/boards/${String(boardId)}/members`,
  },
  /** Дочерний к BOARD: задача, открытая с доски. */
  BOARD_TASK: {
    path: 'tasks/:taskKey',
    build: (boardId: number, taskKey: string) =>
      `/boards/${String(boardId)}/tasks/${encodeURIComponent(taskKey)}`,
  },
  /** Постоянная ссылка на задачу: её копируют и пересылают. */
  TASK: {
    path: '/tasks/:taskKey',
    build: (taskKey: string) => `/tasks/${encodeURIComponent(taskKey)}`,
  },
  TASK_COMMENT: {
    build: (taskKey: string, commentId: string) =>
      `/tasks/${encodeURIComponent(taskKey)}#comment-${encodeURIComponent(commentId)}`,
  },
  MY_TASKS: { path: '/my-tasks', build: () => '/my-tasks' },
  KPI: {
    path: '/kpi',
    build: (selection?: { boardId: number; sprint?: number }) => {
      if (!selection) return '/kpi';
      const params = new URLSearchParams({ board: String(selection.boardId) });
      if (selection.sprint) params.set('sprint', String(selection.sprint));
      return `/kpi?${params.toString()}`;
    },
  },
  PROFILE: { path: '/profile', build: () => '/profile' },
} as const;

export const DEFAULT_AUTHENTICATED_ROUTE = ROUTES.BOARDS.build();

const MAX_DB_INT = 2_147_483_647;

/** Числовой id из адреса. Мусор и переполнение — `null`, страница покажет «не найдено». */
export function parseIdParam(value: string | undefined): null | number {
  if (!value || !/^\d{1,10}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 && id <= MAX_DB_INT ? id : null;
}

/**
 * Куда вернуть после входа. Пропускает только локальные пути: внешний
 * `returnTo` — классический open redirect, а `/login` и `/api` зациклят вход.
 */
export function safeReturnTo(value: null | string | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\s]/.test(value)
  )
    return DEFAULT_AUTHENTICATED_ROUTE;
  const { pathname } = new URL(value, 'https://local.invalid');
  return pathname === ROUTES.LOGIN.path ||
    pathname === ROUTES.REGISTER.path ||
    pathname.startsWith('/api/')
    ? DEFAULT_AUTHENTICATED_ROUTE
    : value;
}

/** Адрес входа, который вернёт пользователя туда, где его застал выход. */
export function loginRedirect(from: {
  pathname: string;
  search: string;
  hash: string;
}): string {
  const target = `${from.pathname}${from.search}${from.hash}`;
  return target === '/' || target === ROUTES.LOGIN.path
    ? ROUTES.LOGIN.build()
    : `${ROUTES.LOGIN.build()}?returnTo=${encodeURIComponent(target)}`;
}
