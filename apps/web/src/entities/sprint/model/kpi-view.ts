import {
  STAGE_STATUSES,
  type SprintKpi,
  type StageStatus,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskStatus,
  type UserBrief,
} from '@gwmt/contracts';

import {
  formatDayMonth,
  formatNumber,
  formatSp,
  pluralRu,
} from '@/shared/lib/format';

/**
 * Превращает ответ `/sprints/:n/kpi` в данные для графиков кита.
 * Чистые функции: страница KPI только раскладывает результат по карточкам.
 */

export const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: 'var(--status-todo)',
  work: 'var(--status-work)',
  review: 'var(--status-review)',
  test: 'var(--status-test)',
  done: 'var(--status-done)',
};

const ADDED_FORMS = [
  'задача добавлена',
  'задачи добавлены',
  'задач добавлено',
] as const;
const DAY_FORMS = ['день', 'дня', 'дней'] as const;

export interface KpiTile {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly sub: string;
  readonly progress?: number;
}

export function buildKpiTiles(kpi: SprintKpi): KpiTile[] {
  const { summary } = kpi;
  const isActive = kpi.sprint.state === 'active';
  const median = summary.medianCycleDays;
  return [
    {
      id: 'done',
      label: 'Выполнено',
      value: formatSp(summary.doneSp),
      sub: `из ${formatSp(summary.scopeSp)} · ${String(summary.donePct)}%`,
      progress: summary.donePct,
    },
    isActive
      ? {
          id: 'forecast',
          label: 'Прогноз к концу спринта',
          value: formatSp(summary.forecastDoneSp ?? summary.doneSp),
          sub: `при темпе ${formatNumber(summary.paceSpPerDay)} SP в день`,
        }
      : {
          id: 'result',
          label: 'Итог спринта',
          value: `${String(summary.donePct)}%`,
          sub: 'объёма закрыто',
        },
    {
      id: 'scope',
      label: 'Изменение объёма',
      value: `${summary.addedSp > 0 ? '+' : ''}${formatSp(summary.addedSp)}`,
      sub: `${String(summary.addedCount)} ${pluralRu(summary.addedCount, ADDED_FORMS)} после старта`,
    },
    {
      id: 'cycle',
      label: 'Время цикла',
      value: `${formatNumber(median)} ${pluralRu(Number.isInteger(median) ? median : Math.ceil(median), DAY_FORMS)}`,
      sub: 'медиана от старта до готовности',
    },
  ];
}

export interface KpiSeries {
  readonly name: string;
  readonly values: readonly (null | number)[];
  readonly color: string;
}

export interface BurndownView {
  readonly labels: readonly string[];
  readonly remaining: readonly (null | number)[];
  readonly ideal: readonly number[];
  /** Пунктир от сегодня до конца; `null` у завершённого спринта. */
  readonly forecast: null | readonly (null | number)[];
  /** Дни, когда в спринт добавили задачи: `+3` над точкой. */
  readonly added: readonly { readonly index: number; readonly sp: number }[];
  readonly remainingNow: number;
  readonly scopeNow: number;
}

export function buildBurndown(kpi: SprintKpi): BurndownView {
  const today = kpi.sprint.todayIndex;
  const remaining = kpi.days.map((day) => day.remainingSp);
  const remainingNow = remaining[today] ?? 0;
  const forecastEnd = kpi.summary.forecastRemainingSp;
  const last = kpi.days.length - 1;
  const forecast =
    kpi.sprint.state === 'active' && forecastEnd !== null && today < last
      ? kpi.days.map((_, index) =>
          index < today
            ? null
            : remainingNow +
              ((forecastEnd - remainingNow) * (index - today)) / (last - today),
        )
      : null;
  return {
    labels: kpi.days.map((day) => formatDayMonth(day.date)),
    remaining,
    ideal: kpi.days.map((day) => day.idealRemainingSp),
    forecast,
    added: kpi.days.flatMap((day) =>
      day.index > 0 && day.addedSp
        ? [{ index: day.index, sp: day.addedSp }]
        : [],
    ),
    remainingNow,
    scopeNow: kpi.days[today]?.scopeSp ?? kpi.summary.scopeSp,
  };
}

/** Накопительный поток: слои снизу вверх — Готово, Тестирование, Ревью, В работе, К работе. */
export function buildFlow(kpi: SprintKpi): {
  readonly labels: readonly string[];
  readonly series: readonly KpiSeries[];
} {
  return {
    labels: kpi.days.map((day) => formatDayMonth(day.date)),
    series: [...TASK_STATUSES].reverse().map((status) => ({
      name: TASK_STATUS_LABELS[status],
      color: STATUS_COLOR[status],
      values: kpi.days.map((day) => day.flow?.[status] ?? null),
    })),
  };
}

export interface VelocityView {
  readonly labels: readonly string[];
  readonly planned: readonly number[];
  readonly done: readonly number[];
  readonly highlightIndex: number;
  readonly average: null | { readonly value: number; readonly label: string };
}

export function buildVelocity(kpi: SprintKpi): VelocityView {
  const { items, averageDoneSp } = kpi.velocity;
  return {
    labels: items.map((item) => `С${String(item.number)}`),
    planned: items.map((item) => item.plannedSp),
    done: items.map((item) => item.doneSp),
    highlightIndex: items.findIndex(
      (item) => item.number === kpi.sprint.number,
    ),
    average:
      averageDoneSp === null
        ? null
        : {
            value: averageDoneSp,
            label: `Средняя: ${String(Math.round(averageDoneSp))}`,
          },
  };
}

export interface DonutView {
  readonly donePct: number;
  readonly segments: readonly {
    readonly status: TaskStatus;
    readonly label: string;
    readonly value: number;
    readonly color: string;
  }[];
}

export function buildStatusDonut(kpi: SprintKpi): DonutView {
  const total = TASK_STATUSES.reduce(
    (sum, status) => sum + kpi.byStatus[status],
    0,
  );
  return {
    donePct: total > 0 ? Math.round((kpi.byStatus.done / total) * 100) : 0,
    segments: [...TASK_STATUSES].reverse().map((status) => ({
      status,
      label: TASK_STATUS_LABELS[status],
      value: kpi.byStatus[status],
      color: STATUS_COLOR[status],
    })),
  };
}

export interface StagesView {
  readonly rows: readonly {
    readonly status: StageStatus;
    readonly label: string;
    readonly value: string;
    readonly pct: number;
    readonly color: string;
  }[];
  readonly note: string;
}

export function buildStages(kpi: SprintKpi): StagesView {
  const days = new Map(
    kpi.stages.map((stage) => [stage.status, stage.avgDays]),
  );
  const max = Math.max(0.5, ...kpi.stages.map((stage) => stage.avgDays));
  return {
    rows: STAGE_STATUSES.map((status) => {
      const avg = days.get(status) ?? 0;
      return {
        status,
        label: TASK_STATUS_LABELS[status],
        value: `${formatNumber(avg)} дн`,
        pct: Math.round((avg / max) * 100),
        color: STATUS_COLOR[status],
      };
    }),
    note: kpi.slowestStage
      ? `Дольше всего задачи стоят на этапе «${TASK_STATUS_LABELS[kpi.slowestStage]}»`
      : 'Задачи ещё не прошли ни одного этапа',
  };
}

export interface TeamRow {
  readonly user: UserBrief;
  readonly doneSp: string;
  readonly reviews: number;
  readonly tests: number;
  readonly pct: number;
}

export function buildTeam(kpi: SprintKpi): TeamRow[] {
  const max = Math.max(1, ...kpi.team.map((member) => member.doneSp));
  return kpi.team.map((member) => ({
    user: member.user,
    doneSp: formatNumber(member.doneSp),
    reviews: member.reviewsCount,
    tests: member.testsCount,
    pct: Math.round((member.doneSp / max) * 100),
  }));
}

/** Подпись для скринридера: «Сгорание: осталось 23 SP из 33». */
export function burndownAlt(view: BurndownView): string {
  return `Сгорание: осталось ${formatSp(view.remainingNow)} из ${formatNumber(view.scopeNow)}`;
}
