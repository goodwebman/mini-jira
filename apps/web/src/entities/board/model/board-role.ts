import {
  BOARD_ROLES,
  BOARD_ROLE_LABELS,
  type BoardRole,
  can,
} from '@gwmt/contracts';

export interface BoardRoleMeta {
  readonly label: string;
  readonly short: string;
  readonly tone: 'accent' | 'neutral' | 'warning';
  /** Что может роль: легенда на экране участников. */
  readonly description: string;
}

export const BOARD_ROLE_META: Record<BoardRole, BoardRoleMeta> = {
  admin: {
    label: BOARD_ROLE_LABELS.admin,
    short: 'Админ',
    tone: 'accent',
    description:
      'Полные права: участники и роли, любые переходы статусов, свойства задач, запрет брать задачу в работу.',
  },
  worker: {
    label: BOARD_ROLE_LABELS.worker,
    short: 'Рабочий',
    tone: 'neutral',
    description:
      'Создаёт задачи, двигает свои задачи вперёд, ставит на паузу, комментирует и связывает. Назад возвращает только со своего этапа: как ревьювер или тестировщик.',
  },
  guest: {
    label: BOARD_ROLE_LABELS.guest,
    short: 'Гость',
    tone: 'warning',
    description:
      'Только просмотр: доска, задачи и KPI без возможности что-либо менять.',
  },
};

export const BOARD_ROLE_OPTIONS = BOARD_ROLES.map((value) => ({
  value,
  label: BOARD_ROLE_LABELS[value],
}));

export function isBoardRole(value: unknown): value is BoardRole {
  return (BOARD_ROLES as readonly unknown[]).includes(value);
}

export interface BoardPermissions {
  readonly canCreateTask: boolean;
  readonly canEditTask: boolean;
  readonly canDeleteTask: boolean;
  readonly canLinkTasks: boolean;
  readonly canComment: boolean;
  readonly canPauseTasks: boolean;
  readonly canLockTasks: boolean;
  readonly canManageMembers: boolean;
  /** Гость: интерфейс показывает плашку «можно только смотреть». */
  readonly isReadOnly: boolean;
}

/**
 * Что показывать пользователю с этой ролью. Источник правил — `can` из контрактов,
 * тот же, что на сервере: интерфейс прячет действия, сервер их всё равно проверяет.
 */
export function getBoardPermissions(role: BoardRole): BoardPermissions {
  return {
    canCreateTask: can(role, 'task.create'),
    canEditTask: can(role, 'task.edit'),
    canDeleteTask: can(role, 'task.delete'),
    canLinkTasks: can(role, 'task.link'),
    canComment: can(role, 'task.comment'),
    canPauseTasks: can(role, 'task.pause'),
    canLockTasks: can(role, 'task.lock'),
    canManageMembers: can(role, 'members.manage'),
    isReadOnly: role === 'guest',
  };
}
