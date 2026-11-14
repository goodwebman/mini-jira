import {
  TASK_ROLE_LABELS,
  TASK_STATUSES,
  type TaskCard,
  type TaskRole,
  type TaskStatus,
  type UserBrief,
} from '@gwmt/contracts';

export function groupTasksByStatus<T extends { readonly status: TaskStatus }>(
  tasks: readonly T[],
): Record<TaskStatus, T[]> {
  const groups = Object.fromEntries(
    TASK_STATUSES.map((status) => [status, [] as T[]]),
  ) as Record<TaskStatus, T[]>;
  for (const task of tasks) groups[task.status].push(task);
  return groups;
}

/** Сумма оценок без ошибок плавающей точки: 0.1 + 0.2 = 0.3. */
export function sumSp(tasks: readonly { readonly sp: number }[]): number {
  return Math.round(tasks.reduce((sum, task) => sum + task.sp * 10, 0)) / 10;
}

export interface TaskPerson {
  readonly role: TaskRole;
  readonly roleLabel: string;
  readonly user: UserBrief;
}

/** Люди задачи в порядке ролей; пустые роли пропускаются. */
export function taskPeople(people: TaskCard['people']): TaskPerson[] {
  const entries: [TaskRole, null | UserBrief][] = [
    ['author', people.author],
    ['reviewer', people.reviewer],
    ['tester', people.tester],
    ['designer', people.designer],
  ];
  return entries.flatMap(([role, user]) =>
    user ? [{ role, roleLabel: TASK_ROLE_LABELS[role], user }] : [],
  );
}

/** Роли пользователя в задаче: «Автор, Ревьювер». */
export function taskRolesLabel(roles: readonly TaskRole[]): string {
  return roles.map((role) => TASK_ROLE_LABELS[role]).join(', ');
}
