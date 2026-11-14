import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { matchPath, useLocation } from 'react-router';

import { useCurrentBoardId, useCurrentBoardStore } from '@/entities/board';
import { navSummaryQueryOptions } from '@/entities/profile';
import { TASK_STATUSES } from '@/entities/task';
import { readApiError } from '@/shared/api';
import { formatNumber } from '@/shared/lib/format';
import { ROUTES } from '@/shared/routes';

export type ShellSection = 'boards' | 'kpi' | 'profile' | 'tasks';

const SECTIONS: readonly (readonly [string, ShellSection])[] = [
  [ROUTES.BOARDS.path, 'boards'],
  // Постоянная ссылка на задачу — тоже раздел досок
  [ROUTES.TASK.path, 'boards'],
  [ROUTES.MY_TASKS.path, 'tasks'],
  [ROUTES.KPI.path, 'kpi'],
  [ROUTES.PROFILE.path, 'profile'],
];

export function sectionOf(pathname: string): null | ShellSection {
  const found = SECTIONS.find(([path]) =>
    matchPath({ path, end: false }, pathname),
  );
  return found?.[1] ?? null;
}

/** Активный раздел: всё, что нужно вкладкам и нижнему меню. */
export function useShellSection(): null | ShellSection {
  return sectionOf(useLocation().pathname);
}

const LOADING = 'Загрузка…';

/**
 * Данные плиток бокового меню из `/me/nav-summary` по текущей доске.
 * Если текущую доску удалили или доступ отозван, она забывается и сводка
 * строится по доске, которую выберет сервер.
 */
export function useShellSummary() {
  const currentBoardId = useCurrentBoardId();
  const currentBoard = useCurrentBoardStore();
  const summary = useQuery({
    ...navSummaryQueryOptions(
      currentBoardId ? { boardId: currentBoardId } : {},
    ),
    // Смена текущей доски не превращает плитки в «пусто» на время запроса
    placeholderData: (previous) => previous,
  });
  const status = summary.isError ? readApiError(summary.error).status : null;
  const lostBoard =
    currentBoardId !== null && (status === 403 || status === 404);

  useEffect(() => {
    if (lostBoard) currentBoard.forget();
  }, [lostBoard, currentBoard]);

  const data = summary.data;
  if (!data)
    return {
      boards: { value: undefined, sub: LOADING, columns: [] as number[] },
      tasks: { value: undefined, sub: LOADING, next: [] as string[] },
      kpi: {
        value: undefined,
        sub: LOADING,
        remaining: [] as number[],
        href: ROUTES.KPI.build(),
      },
    };

  return {
    boards: {
      value: data.boardsTotal,
      sub: data.board
        ? `${data.board.name} · спринт ${String(data.board.sprintNumber)}`
        : 'Досок пока нет',
      columns: data.board
        ? TASK_STATUSES.map((key) => data.board?.statusCounts[key] ?? 0)
        : [],
    },
    tasks: {
      value: data.myTasks.openCount,
      sub: `открыто · ${formatNumber(data.myTasks.openSp)} SP`,
      next: data.myTasks.next.map((task) => task.title),
    },
    kpi: {
      value: data.kpi ? `${String(Math.round(data.kpi.donePct))}%` : undefined,
      sub: data.kpi
        ? `закрыто в спринте ${String(data.kpi.sprintNumber)}`
        : 'Метрики спринта',
      remaining: data.kpi?.remaining ?? [],
      href: ROUTES.KPI.build(
        data.board ? { boardId: data.board.id } : undefined,
      ),
    },
  };
}
