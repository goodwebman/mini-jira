import type { TaskStatus } from '@gwmt/contracts';
import { describe, expect, it } from 'vitest';

import {
  type KpiInput,
  type KpiTask,
  computeSprintKpi,
} from '../src/modules/kpi/compute.js';

const TZ = 'Europe/Moscow';
const START = '2026-11-09'; // понедельник

/** Момент по Москве. */
const at = (date: string, time = '12:00') =>
  new Date(`${date}T${time}:00+03:00`);

const USER = 'author';

function task(
  sp: number,
  addedAt: Date,
  path: [TaskStatus, Date, number?][],
  overrides: Partial<KpiTask> = {},
): KpiTask {
  return {
    sp,
    addedAt,
    completedInDays: null,
    authorId: USER,
    reviewerId: 'reviewer',
    testerId: 'tester',
    designerId: null,
    intervals: path.map(([status, enteredAt, pausedSec], index) => ({
      status,
      enteredAt,
      leftAt: path[index + 1]?.[1] ?? null,
      pausedSec: pausedSec ?? 0,
    })),
    ...overrides,
  };
}

const input = (
  tasks: KpiTask[],
  now: Date,
  overrides: Partial<KpiInput> = {},
): KpiInput => ({
  now,
  timezone: TZ,
  number: 3,
  startDate: START,
  isClosed: false,
  tasks,
  memberIds: [USER],
  previousSprints: [],
  ...overrides,
});

const day0 = at('2026-11-09', '09:00');

describe('computeSprintKpi', () => {
  it('пустой спринт: isEmpty, все числа 0, без NaN', () => {
    const kpi = computeSprintKpi(input([], at('2026-11-11')));
    expect(kpi.isEmpty).toBe(true);
    expect(kpi.summary).toEqual({
      scopeSp: 0,
      doneSp: 0,
      donePct: 0,
      committedSp: 0,
      addedSp: 0,
      addedCount: 0,
      paceSpPerDay: 0,
      forecastDoneSp: 0,
      forecastRemainingSp: 0,
      medianCycleDays: 0,
    });
    expect(kpi.slowestStage).toBeNull();
    expect(JSON.stringify(kpi)).not.toContain('NaN');
    expect(JSON.stringify(kpi)).not.toContain('null,"closedSp":NaN');
  });

  it('первый день', () => {
    const kpi = computeSprintKpi(
      input([task(5, day0, [['todo', day0]])], at('2026-11-09', '15:00')),
    );
    expect(kpi.todayIndex).toBe(0);
    expect(kpi.days).toHaveLength(10);
    expect(kpi.days[0]).toMatchObject({
      isPast: true,
      scopeSp: 5,
      doneSp: 0,
      remainingSp: 5,
      addedSp: 0,
      closedSp: 0,
    });
    expect(kpi.days[1]).toMatchObject({
      isPast: false,
      scopeSp: null,
      doneSp: null,
      flow: null,
    });
    expect(kpi.days[1]?.idealRemainingSp).toBeCloseTo(4.4, 5);
    expect(kpi.days[9]?.idealRemainingSp).toBe(0);
    expect(kpi.summary.committedSp).toBe(5);
  });

  it('последний день и прогноз', () => {
    const tasks = [
      task(4, day0, [
        ['todo', day0],
        ['done', at('2026-11-10')],
      ]),
      task(6, day0, [['todo', day0]]),
    ];
    const kpi = computeSprintKpi(input(tasks, at('2026-11-20')));
    expect(kpi.todayIndex).toBe(9);
    expect(kpi.summary).toMatchObject({
      scopeSp: 10,
      doneSp: 4,
      donePct: 40,
      paceSpPerDay: 0.4,
      forecastDoneSp: 4,
      forecastRemainingSp: 6,
    });
  });

  it('прогноз в середине спринта', () => {
    const tasks = [
      task(4, day0, [
        ['todo', day0],
        ['done', at('2026-11-10')],
      ]),
      task(6, day0, [['todo', day0]]),
    ];
    const kpi = computeSprintKpi(input(tasks, at('2026-11-10', '18:00')));
    expect(kpi.todayIndex).toBe(1);
    expect(kpi.summary.paceSpPerDay).toBe(2);
    expect(kpi.summary.forecastDoneSp).toBe(10);
    expect(kpi.summary.forecastRemainingSp).toBe(0);
  });

  it('закрытый спринт: T = 9, прогноза нет, все дни заполнены', () => {
    const tasks = [
      task(3, day0, [
        ['todo', day0],
        ['done', at('2026-11-12')],
      ]),
    ];
    const kpi = computeSprintKpi(
      input(tasks, at('2026-12-20'), { isClosed: true }),
    );
    expect(kpi.todayIndex).toBe(9);
    expect(kpi.summary.forecastDoneSp).toBeNull();
    expect(kpi.summary.forecastRemainingSp).toBeNull();
    expect(kpi.days.every((day) => day.isPast && day.scopeSp === 3)).toBe(true);
    expect(kpi.days[2]?.closedSp).toBe(0);
    expect(kpi.days[3]?.closedSp).toBe(3);
  });

  it('суббота относится к пятнице', () => {
    const saturday = at('2026-11-14', '11:00');
    const tasks = [
      task(5, day0, [
        ['todo', day0],
        ['done', saturday],
      ]),
    ];
    const onSaturday = computeSprintKpi(
      input(tasks, at('2026-11-14', '12:00')),
    );
    expect(onSaturday.todayIndex).toBe(4);
    expect(onSaturday.days[4]).toMatchObject({
      date: '2026-11-13',
      doneSp: 5,
      closedSp: 5,
    });
    expect(onSaturday.days[3]?.doneSp).toBe(0);
  });

  it('задача из done обратно не считается закрытой начиная с этого дня', () => {
    const tasks = [
      task(5, day0, [
        ['todo', day0],
        ['done', at('2026-11-10')],
        ['work', at('2026-11-12')],
      ]),
    ];
    const kpi = computeSprintKpi(input(tasks, at('2026-11-13')));
    expect(kpi.days[1]?.doneSp).toBe(5);
    expect(kpi.days[2]?.doneSp).toBe(5);
    expect(kpi.days[3]?.doneSp).toBe(0);
    expect(kpi.days[3]?.closedSp).toBe(0);
    expect(kpi.byStatus).toMatchObject({ work: 5, done: 0 });
  });

  it('добавленная в день 3 входит в addedSp и не входит в committedSp', () => {
    const late = at('2026-11-12', '10:00');
    const tasks = [
      task(5, day0, [['todo', day0]]),
      task(3, late, [['todo', late]]),
    ];
    const kpi = computeSprintKpi(input(tasks, at('2026-11-13')));
    expect(kpi.summary.committedSp).toBe(5);
    expect(kpi.summary.addedSp).toBe(3);
    expect(kpi.summary.addedCount).toBe(1);
    expect(kpi.summary.scopeSp).toBe(8);
    expect(kpi.days[3]?.addedSp).toBe(3);
    expect(kpi.days[2]?.addedSp).toBe(0);
  });

  it('пауза не входит в stages.avgDays', () => {
    const entered = at('2026-11-09', '10:00');
    const left = at('2026-11-11', '10:00');
    const paused = 86_400; // сутки на паузе из двух
    const tasks = [
      task(1, day0, [
        ['work', entered, paused],
        ['done', left],
      ]),
    ];
    const kpi = computeSprintKpi(input(tasks, at('2026-11-12')));
    expect(kpi.stages).toEqual([
      { status: 'work', avgDays: 1 },
      { status: 'review', avgDays: 0 },
      { status: 'test', avgDays: 0 },
    ]);
    expect(kpi.slowestStage).toBe('work');
  });

  it('интервал считается только по рабочим дням', () => {
    const tasks = [
      task(1, day0, [
        ['review', at('2026-11-13', '12:00')],
        ['done', at('2026-11-16', '12:00')],
      ]),
    ];
    const kpi = computeSprintKpi(input(tasks, at('2026-11-17')));
    expect(kpi.stages[1]).toEqual({ status: 'review', avgDays: 1 });
  });

  it('медиана по задачам в done на день T', () => {
    const done = (days: number) =>
      task(
        1,
        day0,
        [
          ['todo', day0],
          ['done', at('2026-11-10')],
        ],
        { completedInDays: days },
      );
    const odd = computeSprintKpi(
      input([done(1), done(5), done(3)], at('2026-11-11')),
    );
    expect(odd.summary.medianCycleDays).toBe(3);
    const even = computeSprintKpi(input([done(1), done(2)], at('2026-11-11')));
    expect(even.summary.medianCycleDays).toBe(1.5);
  });

  it('суммы считаются в десятых без хвостов', () => {
    const tasks = Array.from({ length: 3 }, () =>
      task(0.1, day0, [['todo', day0]]),
    );
    const kpi = computeSprintKpi(input(tasks, at('2026-11-11')));
    expect(kpi.summary.scopeSp).toBe(0.3);
    expect(kpi.days[2]?.remainingSp).toBe(0.3);
  });

  describe('команда', () => {
    it('считает вклад и включает всех участников ролей', () => {
      const tasks = [
        task(5, day0, [
          ['todo', day0],
          ['done', at('2026-11-10')],
        ]),
        task(
          2,
          day0,
          [
            ['todo', day0],
            ['test', at('2026-11-10')],
          ],
          { authorId: 'other' },
        ),
        task(1, day0, [['todo', day0]], {
          designerId: 'designer',
          testerId: null,
        }),
      ];
      const kpi = computeSprintKpi(
        input(tasks, at('2026-11-11'), { memberIds: [USER, 'idle'] }),
      );
      const byUser = Object.fromEntries(
        kpi.team.map((entry) => [entry.userId, entry]),
      );
      expect(kpi.team[0]?.userId).toBe(USER);
      expect(byUser[USER]).toMatchObject({ doneSp: 5 });
      expect(byUser.reviewer).toMatchObject({
        doneSp: 0,
        reviewsCount: 2,
        testsCount: 0,
      });
      expect(byUser.tester).toMatchObject({ testsCount: 1 });
      expect(byUser.idle).toMatchObject({
        doneSp: 0,
        reviewsCount: 0,
        testsCount: 0,
      });
      expect(byUser.designer).toBeDefined();
      expect(byUser.other).toBeDefined();
    });
  });

  describe('velocity', () => {
    const previous = (number: number, doneSp: number) => ({
      number,
      startDate: '2026-10-26',
      endDate: '2026-11-06',
      plannedSp: 10,
      doneSp,
      isActive: false,
    });

    it('до 6 спринтов, заканчивая выбранным', () => {
      const history = [1, 2, 3, 4, 5, 6, 7].map((n) => previous(n, n));
      const kpi = computeSprintKpi(
        input([task(5, day0, [['todo', day0]])], at('2026-11-11'), {
          number: 8,
          previousSprints: history,
        }),
      );
      expect(kpi.velocity.items.map((item) => item.number)).toEqual([
        3, 4, 5, 6, 7, 8,
      ]);
      expect(kpi.velocity.items.at(-1)).toMatchObject({
        isActive: true,
        plannedSp: 5,
        doneSp: 0,
      });
    });

    it('среднее только по закрытым, без них null', () => {
      const kpi = computeSprintKpi(
        input([], at('2026-11-11'), {
          previousSprints: [previous(1, 4), previous(2, 7)],
        }),
      );
      expect(kpi.velocity.averageDoneSp).toBe(5.5);
      expect(
        computeSprintKpi(input([], at('2026-11-11'))).velocity.averageDoneSp,
      ).toBeNull();
    });
  });
});
