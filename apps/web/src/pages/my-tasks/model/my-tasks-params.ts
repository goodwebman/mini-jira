import type { TaskRole, TaskStatus } from '@gwmt/contracts';

import { isTaskRole, isTaskStatus } from '@/entities/task';
import { parseIdParam } from '@/shared/routes';

export interface MyTasksParams {
  readonly q: string;
  readonly status: 'all' | TaskStatus;
  readonly role: 'all' | TaskRole;
  readonly page: number;
}

export const PAGE_SIZE = 50;

/**
 * Фильтры «Моих задач» живут в адресе: их можно отправить ссылкой,
 * они переживают перезагрузку и работают с кнопкой «Назад».
 * Мусор в адресе превращается в значения по умолчанию.
 */
export function readMyTasksParams(params: URLSearchParams): MyTasksParams {
  const status = params.get('status');
  const role = params.get('role');
  return {
    q: params.get('q') ?? '',
    status: isTaskStatus(status) ? status : 'all',
    role: isTaskRole(role) ? role : 'all',
    page: parseIdParam(params.get('page') ?? undefined) ?? 1,
  };
}

/** Новый фильтр сбрасывает страницу: на 5-й странице другого фильтра может не быть. */
export function writeMyTasksParams(
  current: MyTasksParams,
  patch: Partial<MyTasksParams>,
): URLSearchParams {
  const next = { ...current, page: 1, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.status !== 'all') params.set('status', next.status);
  if (next.role !== 'all') params.set('role', next.role);
  if (next.page > 1) params.set('page', String(next.page));
  return params;
}
