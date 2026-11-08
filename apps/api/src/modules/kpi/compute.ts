import {
  STAGE_STATUSES,
  TASK_STATUSES,
  type SprintKpi,
  type StageStatus,
  type TaskStatus,
} from '@gwmt/contracts';
import {
  addDays,
  sprintEndDate,
  sprintWorkdays,
  startOfDayInZone,
  workingSeconds,
  type IsoDate,
} from '../../lib/workdays.js';

export interface KpiInterval {
  status: TaskStatus;
  enteredAt: Date;
  leftAt: Date | null;
  pausedSec: number;
}

export interface KpiTask {
  sp: number;
  addedAt: Date;
  completedInDays: number | null;
  authorId: string;
  reviewerId: string;
  testerId: string | null;
  designerId: string | null;
  intervals: KpiInterval[];
}

export type VelocityItem = SprintKpi['velocity']['items'][number];

export interface KpiInput {
  now: Date;
  timezone: string;
  number: number;
  startDate: IsoDate;
  isClosed: boolean;
  tasks: KpiTask[];
  /** Участники доски без гостей. */
  memberIds: string[];
  /** Закрытые спринты до выбранного, от старых к новым. */
  previousSprints: VelocityItem[];
}

export interface KpiTeamEntry {
  userId: string;
  doneSp: number;
  reviewsCount: number;
  testsCount: number;
}

/** Всё, что считается по данным спринта. В снимок попадают только userId и числа. */
export type SprintKpiSnapshot = Pick<
  SprintKpi,
  'isEmpty' | 'summary' | 'days' | 'byStatus' | 'stages' | 'slowestStage' | 'velocity'
> & {
  todayIndex: number;
  team: KpiTeamEntry[];
};

const LAST_DAY = 9;
const SECONDS_IN_DAY = 86_400;
const MAX_VELOCITY_ITEMS = 6;

const toTenths = (sp: number) => Math.round(sp * 10);
const fromTenths = (tenths: number) => tenths / 10;
const round1 = (value: number) => Math.round(value * 10) / 10;

const emptyFlow = (): Record<TaskStatus, number> => ({
  todo: 0,
  work: 0,
  review: 0,
  test: 0,
  done: 0,
});

function statusBefore(task: KpiTask, cutoff: Date): TaskStatus | null {
  let status: TaskStatus | null = null;
  for (const interval of task.intervals) {
    if (interval.enteredAt < cutoff) status = interval.status;
  }
  return status;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

function resolveTodayIndex(input: KpiInput, dates: IsoDate[]): number {
  if (input.isClosed) return LAST_DAY;
  let today = 0;
  dates.forEach((date, index) => {
    if (startOfDayInZone(date, input.timezone) <= input.now) today = index;
  });
  return today;
}

function averageStageDays(
  input: KpiInput,
  stage: StageStatus,
  scopeAtToday: KpiTask[],
  from: Date,
  to: Date,
): number {
  const durations: number[] = [];
  for (const task of scopeAtToday) {
    for (const interval of task.intervals) {
      if (interval.status !== stage || !interval.leftAt) continue;
      if (interval.leftAt < from || interval.leftAt >= to) continue;
      const seconds = workingSeconds(interval.enteredAt, interval.leftAt, input.timezone);
      durations.push(Math.max(0, seconds - interval.pausedSec) / SECONDS_IN_DAY);
    }
  }
  if (durations.length === 0) return 0;
  return round1(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}

function buildTeam(input: KpiInput, scopeAtToday: KpiTask[], cutoff: Date): KpiTeamEntry[] {
  const entries = new Map<string, { doneTenths: number; reviews: number; tests: number }>();
  const entry = (userId: string) => {
    let value = entries.get(userId);
    if (!value) {
      value = { doneTenths: 0, reviews: 0, tests: 0 };
      entries.set(userId, value);
    }
    return value;
  };

  input.memberIds.forEach(entry);
  for (const task of input.tasks) {
    for (const userId of [task.authorId, task.reviewerId, task.testerId, task.designerId]) {
      if (userId) entry(userId);
    }
  }

  for (const task of scopeAtToday) {
    const status = statusBefore(task, cutoff);
    if (status === 'done') entry(task.authorId).doneTenths += toTenths(task.sp);
    if (status === 'test' || status === 'done') entry(task.reviewerId).reviews += 1;
    if (status === 'done' && task.testerId) entry(task.testerId).tests += 1;
  }

  return [...entries]
    .map(([userId, value]) => ({
      userId,
      doneSp: fromTenths(value.doneTenths),
      reviewsCount: value.reviews,
      testsCount: value.tests,
    }))
    .sort((a, b) => b.doneSp - a.doneSp);
}

export function computeSprintKpi(input: KpiInput): SprintKpiSnapshot {
  const { timezone, startDate, isClosed, tasks } = input;
  const dates = sprintWorkdays(startDate);
  const cutoffs = dates.map((date, index) =>
    startOfDayInZone(index === LAST_DAY ? addDays(date, 3) : (dates[index + 1] as IsoDate), timezone),
  );
  const today = resolveTodayIndex(input, dates);

  const scopes: number[] = [];
  const dones: number[] = [];
  const flows: Record<TaskStatus, number>[] = [];
  for (let index = 0; index <= today; index += 1) {
    const cutoff = cutoffs[index] as Date;
    const flow = emptyFlow();
    let scope = 0;
    for (const task of tasks) {
      if (task.addedAt >= cutoff) continue;
      const tenths = toTenths(task.sp);
      scope += tenths;
      const status = statusBefore(task, cutoff);
      if (status) flow[status] += tenths;
    }
    scopes.push(scope);
    dones.push(flow.done);
    flows.push(flow);
  }

  const scopeTenths = scopes[today] as number;
  const doneTenths = dones[today] as number;
  const committedTenths = scopes[0] as number;
  const remaining = fromTenths(scopeTenths - doneTenths);
  const scopeSp = fromTenths(scopeTenths);
  const doneSp = fromTenths(doneTenths);
  const pace = doneSp / (today + 1);
  const daysLeft = LAST_DAY - today;

  const firstCutoff = cutoffs[0] as Date;
  const todayCutoff = cutoffs[today] as Date;
  const added = tasks.filter((task) => task.addedAt >= firstCutoff && task.addedAt < todayCutoff);
  const addedTenths = added.reduce((sum, task) => sum + toTenths(task.sp), 0);

  const scopeAtToday = tasks.filter((task) => task.addedAt < todayCutoff);
  const cycleDays = scopeAtToday
    .filter((task) => statusBefore(task, todayCutoff) === 'done')
    .map((task) => task.completedInDays)
    .filter((days): days is number => days !== null);

  const sprintStart = startOfDayInZone(startDate, timezone);
  const stages = STAGE_STATUSES.map((status) => ({
    status,
    avgDays: averageStageDays(input, status, scopeAtToday, sprintStart, todayCutoff),
  }));
  const slowest = stages.reduce((best, stage) => (stage.avgDays > best.avgDays ? stage : best));

  const days = dates.map((date, index) => {
    const isPast = index <= today;
    const idealRemainingSp = round1(fromTenths(committedTenths) * (1 - index / LAST_DAY));
    if (!isPast) {
      return {
        index,
        date,
        isPast,
        idealRemainingSp,
        scopeSp: null,
        doneSp: null,
        remainingSp: null,
        addedSp: null,
        closedSp: null,
        flow: null,
      };
    }
    const scope = scopes[index] as number;
    const done = dones[index] as number;
    const previousScope = index === 0 ? scope : (scopes[index - 1] as number);
    const previousDone = index === 0 ? 0 : (dones[index - 1] as number);
    const flow = flows[index] as Record<TaskStatus, number>;
    return {
      index,
      date,
      isPast,
      idealRemainingSp,
      scopeSp: fromTenths(scope),
      doneSp: fromTenths(done),
      remainingSp: fromTenths(scope - done),
      addedSp: fromTenths(Math.max(0, scope - previousScope)),
      closedSp: fromTenths(Math.max(0, done - previousDone)),
      flow: Object.fromEntries(
        TASK_STATUSES.map((status) => [status, fromTenths(flow[status])]),
      ) as Record<TaskStatus, number>,
    };
  });

  const velocityItems: VelocityItem[] = [
    ...input.previousSprints.slice(-(MAX_VELOCITY_ITEMS - 1)),
    {
      number: input.number,
      startDate,
      endDate: sprintEndDate(startDate),
      plannedSp: fromTenths(committedTenths),
      doneSp,
      isActive: !isClosed,
    },
  ];
  const closedDone = velocityItems.filter((item) => !item.isActive).map((item) => item.doneSp);

  return {
    todayIndex: today,
    isEmpty: tasks.length === 0,
    summary: {
      scopeSp,
      doneSp,
      donePct: scopeTenths === 0 ? 0 : Math.round((doneTenths / scopeTenths) * 100),
      committedSp: fromTenths(committedTenths),
      addedSp: fromTenths(addedTenths),
      addedCount: added.length,
      paceSpPerDay: round1(pace),
      forecastDoneSp: isClosed ? null : Math.min(scopeSp, Math.round(doneSp + pace * daysLeft)),
      forecastRemainingSp: isClosed ? null : round1(Math.max(0, remaining - pace * daysLeft)),
      medianCycleDays: median(cycleDays),
    },
    days,
    byStatus: days[today]?.flow ?? emptyFlow(),
    stages,
    slowestStage: slowest.avgDays > 0 ? slowest.status : null,
    velocity: {
      items: velocityItems,
      averageDoneSp:
        closedDone.length === 0
          ? null
          : round1(closedDone.reduce((sum, value) => sum + value, 0) / closedDone.length),
    },
    team: buildTeam(input, scopeAtToday, todayCutoff),
  };
}
