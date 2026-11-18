/**
 * Тесткейсы: таймер по каждому статусу, пауза, накопленная пауза, done без completedInDays, часы клиента спешат;
 * фильтры по запросу/ключу/приоритету/людям; группировка и сумма SP без ошибок float;
 * люди задачи; правила переходов: гость, запрет, возвраты ревьювера и тестировщика; создание в колонке.
 */
import { describe, expect, it } from 'vitest';

import { makeTask, users } from '@/shared/lib/testing';

import {
  EMPTY_TASK_FILTERS,
  canCreateInStatus,
  effectiveFilters,
  filterTasks,
  getTaskTimerView,
  groupTasksByStatus,
  hasActiveTaskFilters,
  sumSp,
  taskAllowedStatuses,
  taskMoveError,
  taskPeople,
  taskRolesLabel,
} from '../index';

const ENTERED = '2026-11-06T09:00:00.000Z';
const at = (minutesLater: number) =>
  Date.parse(ENTERED) + minutesLater * 60_000;
const timer = {
  statusEnteredAt: ENTERED,
  pausedAt: null,
  pausedTotalSec: 0,
  spentSec: 0,
  canPause: true,
  completedInDays: null,
};

describe('getTaskTimerView', () => {
  it.each([
    ['todo', 'Ждёт 2 ч', 'neutral'],
    ['work', 'В работе 2 ч', 'accent'],
    ['review', 'На ревью 2 ч', 'review'],
    ['test', 'В тесте 2 ч', 'test'],
  ] as const)('%s → %s', (status, label, tone) => {
    const view = getTaskTimerView(status, timer, at(120));
    expect(view).toMatchObject({
      label,
      short: '2 ч',
      tone,
      icon: 'clock',
      isPaused: false,
    });
  });

  it('вычитает накопленную паузу', () => {
    const view = getTaskTimerView(
      'work',
      { ...timer, pausedTotalSec: 3600 },
      at(150),
    );
    expect(view.label).toBe('В работе 1 ч 30 мин');
  });

  it('на паузе считает время с начала паузы', () => {
    const paused = { ...timer, pausedAt: '2026-11-06T10:00:00.000Z' };
    expect(getTaskTimerView('review', paused, at(105))).toMatchObject({
      label: 'На паузе 45 мин',
      short: 'Пауза 45 мин',
      tone: 'warning',
      icon: 'pause',
      isPaused: true,
      canToggle: true,
    });
  });

  it('готовая задача показывает дни выполнения, без данных — минимум 1 день', () => {
    expect(
      getTaskTimerView(
        'done',
        { ...timer, canPause: false, completedInDays: 3 },
        at(0),
      ),
    ).toMatchObject({
      label: 'Сделана за 3 д',
      tone: 'success',
      icon: 'check',
      canToggle: false,
    });
    expect(getTaskTimerView('done', timer, at(0)).label).toBe('Сделана за 1 д');
  });

  it('часы клиента спешат назад: не показывает отрицательное время', () => {
    expect(getTaskTimerView('todo', timer, at(-30)).label).toBe(
      'Ждёт меньше минуты',
    );
  });
});

describe('фильтры задач', () => {
  it('исключает недоступных участников, сохраняя ссылку на фильтры без изменений', () => {
    const filters = { ...EMPTY_TASK_FILTERS, assigneeIds: ['u1', 'u2'] };
    expect(effectiveFilters(filters, ['u2', 'u3']).assigneeIds).toEqual(['u2']);
    expect(effectiveFilters(filters, []).assigneeIds).toEqual([]);
    expect(effectiveFilters(filters, ['u1', 'u2', 'u3'])).toBe(filters);
  });
  const login = makeTask({
    key: 'GWT-1',
    title: 'Экран входа',
    priority: 'high',
  });
  const kpi = makeTask({
    key: 'GWT-2',
    title: 'График KPI',
    people: {
      author: users.dmitry,
      reviewer: users.elena,
      tester: null,
      designer: users.viktoria,
    },
  });

  it('без фильтров возвращает все задачи', () => {
    expect(filterTasks([login, kpi], EMPTY_TASK_FILTERS)).toEqual([login, kpi]);
    expect(hasActiveTaskFilters(EMPTY_TASK_FILTERS)).toBe(false);
    expect(hasActiveTaskFilters({ ...EMPTY_TASK_FILTERS, query: '   ' })).toBe(
      false,
    );
  });

  it('ищет по названию и ключу без учёта регистра', () => {
    expect(
      filterTasks([login, kpi], { ...EMPTY_TASK_FILTERS, query: ' вход' }),
    ).toEqual([login]);
    expect(
      filterTasks([login, kpi], { ...EMPTY_TASK_FILTERS, query: 'gwt-2' }),
    ).toEqual([kpi]);
  });

  it('фильтрует по приоритету', () => {
    expect(
      filterTasks([login, kpi], { ...EMPTY_TASK_FILTERS, priority: 'high' }),
    ).toEqual([login]);
  });

  it('по людям: задача подходит, если участвует любой из выбранных в любой роли', () => {
    const byDesigner = {
      ...EMPTY_TASK_FILTERS,
      assigneeIds: [users.viktoria.id],
    };
    expect(filterTasks([login, kpi], byDesigner)).toEqual([kpi]);
    const byEither = {
      ...EMPTY_TASK_FILTERS,
      assigneeIds: [users.viktoria.id, users.ivan.id],
    };
    expect(filterTasks([login, kpi], byEither)).toEqual([login, kpi]);
  });
});

describe('группировка и люди', () => {
  it('раскладывает по колонкам в порядке доски и сохраняет порядок карточек', () => {
    const a = makeTask({ status: 'work' });
    const b = makeTask({ status: 'todo' });
    const c = makeTask({ status: 'work' });
    const groups = groupTasksByStatus([a, b, c]);
    expect(Object.keys(groups)).toEqual([
      'todo',
      'work',
      'review',
      'test',
      'done',
    ]);
    expect(groups.work).toEqual([a, c]);
    expect(groups.done).toEqual([]);
  });

  it('сумма SP без ошибок плавающей точки', () => {
    expect(sumSp([{ sp: 0.1 }, { sp: 0.2 }])).toBe(0.3);
    expect(sumSp([])).toBe(0);
  });

  it('люди задачи по ролям, пустые роли пропущены', () => {
    const task = makeTask({
      people: {
        author: users.anna,
        reviewer: users.ivan,
        tester: null,
        designer: users.viktoria,
      },
    });
    expect(
      taskPeople(task.people).map((person) => [
        person.roleLabel,
        person.user.name,
      ]),
    ).toEqual([
      ['Автор', 'Анна Смирнова'],
      ['Ревьювер', 'Иван Петров'],
      ['Дизайнер', 'Виктория Лебедева'],
    ]);
    expect(taskRolesLabel(['author', 'tester'])).toBe('Автор, Тестировщик');
  });
});

describe('правила переходов', () => {
  const worker = { id: users.anna.id, role: 'worker' as const };
  const reviewer = { id: users.ivan.id, role: 'worker' as const };

  it('для чужой задачи доступен только текущий статус', () => {
    const outsider = { id: users.dmitry.id, role: 'worker' as const };
    const task = makeTask({ status: 'todo' });
    expect(taskAllowedStatuses(outsider, task)).toEqual(['todo']);
    expect(taskMoveError(outsider, task, 'work')).toBe(
      'Перемещение недоступно: задача не назначена вам или переход запрещён',
    );
  });

  it('гость не двигает ничего', () => {
    const task = makeTask({ status: 'todo' });
    expect(
      taskMoveError({ id: users.viktoria.id, role: 'guest' }, task, 'work'),
    ).toBe('Гость может только смотреть');
  });

  it('рабочий двигает вперёд, но не берёт задачу под запретом', () => {
    expect(
      taskMoveError(worker, makeTask({ status: 'todo' }), 'work'),
    ).toBeNull();
    expect(
      taskMoveError(
        worker,
        makeTask({ status: 'todo', isTakeLocked: true }),
        'work',
      ),
    ).toBe('Администратор запретил брать эту задачу в работу');
  });

  it('назад возвращает только ревьювер или тестировщик со своего этапа', () => {
    const review = makeTask({ status: 'review' });
    expect(taskMoveError(worker, review, 'work')).toBe(
      'Перемещение недоступно: задача не назначена вам или переход запрещён',
    );
    expect(taskMoveError(reviewer, review, 'work')).toBeNull();
    expect(taskAllowedStatuses(reviewer, review)).toEqual([
      'work',
      'review',
      'test',
      'done',
    ]);
  });

  it('администратор двигает куда угодно, даже под запретом', () => {
    const locked = makeTask({ status: 'todo', isTakeLocked: true });
    expect(
      taskMoveError({ id: users.anna.id, role: 'admin' }, locked, 'done'),
    ).toBeNull();
  });

  it('создание в колонке: рабочий только в «К работе», гость нигде', () => {
    expect(canCreateInStatus('worker', 'todo')).toBe(true);
    expect(canCreateInStatus('worker', 'work')).toBe(false);
    expect(canCreateInStatus('admin', 'test')).toBe(true);
    expect(canCreateInStatus('guest', 'todo')).toBe(false);
  });
});
