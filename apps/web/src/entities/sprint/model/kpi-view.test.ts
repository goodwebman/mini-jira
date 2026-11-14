/** Тесткейсы: плитки активного и завершённого спринта, формы слов; сгорание: прошлое, будущие null, прогноз-пунктир, добавления; поток по слоям; скорость с подсветкой и средней; донат; этапы и медленный; команда в процентах от лидера. */
import { describe, expect, it } from 'vitest';

import { makeSprintKpi, users } from '@/shared/lib/testing';

import {
  buildBurndown,
  buildFlow,
  buildKpiTiles,
  buildStages,
  buildStatusDonut,
  buildTeam,
  buildVelocity,
  burndownAlt,
  sprintCaption,
  sprintProgress,
} from '../index';

describe('плитки KPI', () => {
  it('активный спринт: выполнено, прогноз, изменение объёма, цикл', () => {
    expect(buildKpiTiles(makeSprintKpi())).toEqual([
      {
        id: 'done',
        label: 'Выполнено',
        value: '10 SP',
        sub: 'из 33 SP · 30%',
        progress: 30,
      },
      {
        id: 'forecast',
        label: 'Прогноз к концу спринта',
        value: '20 SP',
        sub: 'при темпе 2 SP в день',
      },
      {
        id: 'scope',
        label: 'Изменение объёма',
        value: '+3 SP',
        sub: '1 задача добавлена после старта',
      },
      {
        id: 'cycle',
        label: 'Время цикла',
        value: '2,5 дня',
        sub: 'медиана от старта до готовности',
      },
    ]);
  });

  it('завершённый спринт показывает итог вместо прогноза', () => {
    const kpi = makeSprintKpi();
    const closed = makeSprintKpi({
      sprint: { ...kpi.sprint, state: 'closed' },
      summary: {
        ...kpi.summary,
        addedSp: 0,
        addedCount: 5,
        medianCycleDays: 1,
      },
    });
    const tiles = buildKpiTiles(closed);
    expect(tiles[1]).toEqual({
      id: 'result',
      label: 'Итог спринта',
      value: '30%',
      sub: 'объёма закрыто',
    });
    expect(tiles[2]).toMatchObject({
      value: '0 SP',
      sub: '5 задач добавлено после старта',
    });
    expect(tiles[3]?.value).toBe('1 день');
  });
});

describe('сгорание', () => {
  it('прошлые дни с данными, будущие пустые, прогноз от сегодня до конца', () => {
    const view = buildBurndown(makeSprintKpi());
    expect(view.labels[0]).toBe('2 ноя');
    expect(view.remaining).toEqual([
      30,
      28,
      25,
      25,
      23,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(view.ideal[0]).toBe(30);
    expect(view.ideal[9]).toBe(0);
    expect(view.forecast?.slice(0, 4)).toEqual([null, null, null, null]);
    expect(view.forecast?.[4]).toBe(23);
    expect(view.forecast?.[9]).toBe(13);
    expect(view.added).toEqual([{ index: 3, sp: 3 }]);
    expect(burndownAlt(view)).toBe('Сгорание: осталось 23 SP из 33');
  });

  it('у завершённого спринта нет прогноза', () => {
    const kpi = makeSprintKpi();
    expect(
      buildBurndown({ ...kpi, sprint: { ...kpi.sprint, state: 'closed' } })
        .forecast,
    ).toBeNull();
  });
});

describe('графики', () => {
  it('поток: слои снизу вверх от «Готово» к «К работе», будущее пустое', () => {
    const flow = buildFlow(makeSprintKpi());
    expect(flow.series.map((series) => series.name)).toEqual([
      'Готово',
      'Тестирование',
      'Ревью',
      'В работе',
      'К работе',
    ]);
    expect(flow.series[0]?.values.slice(3, 6)).toEqual([8, 10, null]);
    expect(flow.series[0]?.color).toBe('var(--status-done)');
  });

  it('скорость: подсвечен выбранный спринт, средняя по закрытым', () => {
    expect(buildVelocity(makeSprintKpi())).toEqual({
      labels: ['С12', 'С13', 'С14'],
      planned: [28, 30, 30],
      done: [25, 31, 10],
      highlightIndex: 2,
      average: { value: 28, label: 'Средняя: 28' },
    });
    const kpi = makeSprintKpi();
    expect(
      buildVelocity({
        ...kpi,
        velocity: { ...kpi.velocity, averageDoneSp: null },
      }).average,
    ).toBeNull();
  });

  it('донат: доля закрытого объёма и сегменты от «Готово»', () => {
    const donut = buildStatusDonut(makeSprintKpi());
    expect(donut.donePct).toBe(30);
    expect(donut.segments.map((segment) => segment.value)).toEqual([
      10, 2, 3, 8, 10,
    ]);
    const empty = makeSprintKpi({
      byStatus: { todo: 0, work: 0, review: 0, test: 0, done: 0 },
    });
    expect(buildStatusDonut(empty).donePct).toBe(0);
  });

  it('этапы: доли от самого долгого и подпись медленного этапа', () => {
    const stages = buildStages(makeSprintKpi());
    expect(stages.rows.map((row) => [row.label, row.value, row.pct])).toEqual([
      ['В работе', '2,5 дн', 100],
      ['Ревью', '1 дн', 40],
      ['Тестирование', '0,5 дн', 20],
    ]);
    expect(stages.note).toBe('Дольше всего задачи стоят на этапе «В работе»');
    expect(buildStages(makeSprintKpi({ slowestStage: null })).note).toBe(
      'Задачи ещё не прошли ни одного этапа',
    );
  });

  it('команда: доля от лидера', () => {
    expect(
      buildTeam(makeSprintKpi()).map((row) => [
        row.user.id,
        row.doneSp,
        row.pct,
      ]),
    ).toEqual([
      [users.anna.id, '6', 100],
      [users.ivan.id, '4', 67],
    ]);
  });
});

describe('спринт', () => {
  it('подписи шапки и бейджа', () => {
    const kpi = makeSprintKpi();
    expect(sprintCaption(kpi.sprint)).toBe('Спринт 14 · 2–13 ноя');
    expect(sprintProgress(kpi.sprint)).toEqual({
      label: 'Идёт · день 5 из 10',
      tone: 'accent',
    });
    expect(sprintProgress({ ...kpi.sprint, state: 'closed' })).toEqual({
      label: 'Завершён',
      tone: 'neutral',
    });
  });
});
