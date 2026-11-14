import { ROUTES } from '@/shared/routes';
import { UIIcons } from '@/shared/ui/icons';

export const SECTIONS = [
  {
    id: 'boards',
    label: 'Доски',
    short: 'Доски',
    icon: UIIcons.Board,
    to: ROUTES.BOARDS.build(),
  },
  {
    id: 'tasks',
    label: 'Мои задачи',
    short: 'Задачи',
    icon: UIIcons.Tasks,
    to: ROUTES.MY_TASKS.build(),
  },
  {
    id: 'kpi',
    label: 'KPI',
    short: 'KPI',
    icon: UIIcons.Chart,
    to: ROUTES.KPI.build(),
  },
  {
    id: 'profile',
    label: 'Профиль',
    short: 'Профиль',
    icon: UIIcons.User,
    to: ROUTES.PROFILE.build(),
  },
] as const;
