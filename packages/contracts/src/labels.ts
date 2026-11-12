import type {
  BoardRole,
  TaskLinkType,
  TaskPriority,
  TaskRole,
  TaskStatus,
} from './enums.js';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'К работе',
  work: 'В работе',
  review: 'Ревью',
  test: 'Тестирование',
  done: 'Готово',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  crit: 'Критичный',
  high: 'Высокий',
  med: 'Средний',
  low: 'Низкий',
};

export const TASK_LINK_LABELS: Record<TaskLinkType, string> = {
  rel: 'Связана с',
  blocks: 'Блокирует',
  blockedBy: 'Заблокирована',
  dup: 'Дублирует',
};

export const TASK_ROLE_LABELS: Record<TaskRole, string> = {
  author: 'Автор',
  reviewer: 'Ревьювер',
  tester: 'Тестировщик',
  designer: 'Дизайнер',
};

export const BOARD_ROLE_LABELS: Record<BoardRole, string> = {
  admin: 'Администратор',
  worker: 'Рабочий',
  guest: 'Гость',
};
