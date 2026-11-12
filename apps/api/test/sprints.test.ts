import { sprintKpiSchema, sprintListResponseSchema } from '@gwmt/contracts';
import { and, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { sprintTasks, sprints, tasks } from '../src/db/schema.js';
import { type Team, createTask, createTeam, moveTask } from './fixtures.js';
import { type TestApp, createTestApp, json } from './helpers.js';

/** Понедельник сразу после спринта 2026-11-09..2026-11-20, 00:00 по Москве. */
const AFTER_SPRINT = new Date('2026-11-22T21:00:00.000Z');

describe('спринты', () => {
  let t: TestApp;
  let team: Team;

  beforeEach(async () => {
    t = await createTestApp();
    team = await createTeam(t);
  });

  afterEach(() => t.close());

  const sprintsOf = (boardId = team.boardId) =>
    t.db
      .select()
      .from(sprints)
      .where(eq(sprints.boardId, boardId))
      .orderBy(sprints.number);

  const boardDetail = async () =>
    json(await t.request('GET', `/boards/${team.boardId}`, team.admin.token));

  it('до понедельника после спринта смены нет', async () => {
    t.clock.current = new Date(AFTER_SPRINT.getTime() - 1000);
    expect((await boardDetail()).currentSprint.number).toBe(1);
    expect(await sprintsOf()).toHaveLength(1);
  });

  it('ленивая смена закрывает спринт и переносит только незакрытые задачи', async () => {
    const open = await createTask(t, team);
    const done = await createTask(t, team, { status: 'done' });

    t.clock.current = AFTER_SPRINT;
    const detail = await boardDetail();
    expect(detail.currentSprint).toMatchObject({
      number: 2,
      state: 'active',
      startDate: '2026-11-23',
      endDate: '2026-12-04',
    });

    const [first, second] = await sprintsOf();
    expect(first).toMatchObject({ state: 'closed', plannedSp: 6, doneSp: 3 });
    expect(first?.kpiSnapshot?.todayIndex).toBe(9);

    const rows = await t.db
      .select()
      .from(tasks)
      .where(eq(tasks.boardId, team.boardId));
    expect(rows.find((row) => row.key === open.key)?.sprintId).toBe(second?.id);
    expect(rows.find((row) => row.key === done.key)?.sprintId).toBe(first?.id);

    const [moved] = await t.db
      .select()
      .from(sprintTasks)
      .where(
        and(
          eq(sprintTasks.sprintId, second!.id),
          eq(sprintTasks.taskId, open.id),
        ),
      );
    expect(moved?.addedAt.toISOString()).toBe(AFTER_SPRINT.toISOString());
  });

  it('новая задача попадает в активный спринт, смена срабатывает при создании', async () => {
    t.clock.current = AFTER_SPRINT;
    const task = await createTask(t, team);
    const [, second] = await sprintsOf();
    expect(task.sprintId).toBe(second?.id);
  });

  it('параллельные запросы в момент смены создают один активный спринт', async () => {
    await createTask(t, team);
    t.clock.current = AFTER_SPRINT;
    const responses = await Promise.all(
      Array.from({ length: 6 }, () => boardDetail()),
    );
    expect(new Set(responses.map((r) => r.currentSprint.number))).toEqual(
      new Set([2]),
    );

    const all = await sprintsOf();
    expect(all).toHaveLength(2);
    expect(all.filter((sprint) => sprint.state === 'active')).toHaveLength(1);

    const links = await t.db
      .select()
      .from(sprintTasks)
      .where(eq(sprintTasks.sprintId, all[1]!.id));
    expect(links).toHaveLength(1);
  });

  it('доска, простоявшая 3 периода, получает один спринт в правильной сетке', async () => {
    await createTask(t, team);
    // 2026-11-09 + 6 недель = 2026-12-21; берём середину следующего периода.
    t.clock.current = new Date('2026-12-24T09:00:00.000Z');
    const detail = await boardDetail();
    expect(detail.currentSprint).toMatchObject({
      number: 2,
      startDate: '2026-12-21',
      endDate: '2027-01-01',
    });
    expect(await sprintsOf()).toHaveLength(2);
  });

  it('запрет брать в работу сохраняется при переносе', async () => {
    const task = await createTask(t, team);
    await t.request('PUT', `/tasks/${task.key}/take-lock`, team.admin.token);
    t.clock.current = AFTER_SPRINT;
    await boardDetail();
    const detail = await json(
      await t.request('GET', `/tasks/${task.key}`, team.admin.token),
    );
    expect(detail.isTakeLocked).toBe(true);
    expect(detail.sprint.number).toBe(2);
  });

  it('перенесённая задача в committedSp нового спринта и остаётся в объёме старого', async () => {
    await createTask(t, team, { sp: 5 });
    t.clock.current = AFTER_SPRINT;

    const fresh = sprintKpiSchema.parse(
      await json(
        await t.request(
          'GET',
          `/boards/${team.boardId}/sprints/2/kpi`,
          team.admin.token,
        ),
      ),
    );
    expect(fresh.summary.committedSp).toBe(5);
    expect(fresh.sprint).toMatchObject({
      number: 2,
      todayIndex: 0,
      dayNumber: 1,
      totalDays: 10,
    });

    const old = sprintKpiSchema.parse(
      await json(
        await t.request(
          'GET',
          `/boards/${team.boardId}/sprints/1/kpi`,
          team.admin.token,
        ),
      ),
    );
    expect(old.summary.scopeSp).toBe(5);
    expect(old.sprint.state).toBe('closed');
    expect(old.summary.forecastDoneSp).toBeNull();
  });

  it('kpi_snapshot не меняется после правки SP задачи', async () => {
    const task = await createTask(t, team, { sp: 5, status: 'done' });
    t.clock.current = AFTER_SPRINT;
    await boardDetail();

    const before = await json(
      await t.request(
        'GET',
        `/boards/${team.boardId}/sprints/1/kpi`,
        team.admin.token,
      ),
    );
    const edit = await t.request(
      'PATCH',
      `/tasks/${task.key}`,
      team.admin.token,
      { sp: 13 },
    );
    expect(edit.status).toBe(200);
    const after = await json(
      await t.request(
        'GET',
        `/boards/${team.boardId}/sprints/1/kpi`,
        team.admin.token,
      ),
    );

    expect(after.summary).toEqual(before.summary);
    expect(after.summary.doneSp).toBe(5);
  });

  it('снимок хранит только userId и числа, имена подставляются при чтении', async () => {
    await createTask(t, team, { status: 'done' });
    t.clock.current = AFTER_SPRINT;
    await boardDetail();

    const [first] = await sprintsOf();
    const text = JSON.stringify(first?.kpiSnapshot);
    expect(text).not.toContain(team.worker.name);
    expect(first?.kpiSnapshot?.team[0]).toHaveProperty('userId');

    const kpi = await json(
      await t.request(
        'GET',
        `/boards/${team.boardId}/sprints/1/kpi`,
        team.admin.token,
      ),
    );
    const names = kpi.team.map(
      (entry: { user: { name: string } }) => entry.user.name,
    );
    expect(names).toContain(team.worker.name);
  });

  it('гости не попадают в команду, пока не занимают роль', async () => {
    await createTask(t, team);
    const kpi = await json(
      await t.request(
        'GET',
        `/boards/${team.boardId}/sprints/1/kpi`,
        team.admin.token,
      ),
    );
    const ids = kpi.team.map(
      (entry: { user: { id: string } }) => entry.user.id,
    );
    expect(ids).toContain(team.admin.id);
    expect(ids).not.toContain(team.guest.id);
  });

  it('несуществующий спринт даёт SPRINT_NOT_FOUND', async () => {
    const res = await t.request(
      'GET',
      `/boards/${team.boardId}/sprints/99/kpi`,
      team.admin.token,
    );
    expect(res.status).toBe(404);
    expect((await json(res)).error.code).toBe('SPRINT_NOT_FOUND');
  });

  it('список спринтов от новых к старым и с цифрами', async () => {
    await createTask(t, team, { sp: 2, status: 'done' });
    t.clock.current = AFTER_SPRINT;
    await createTask(t, team, { sp: 7 });

    const body = sprintListResponseSchema.parse(
      await json(
        await t.request(
          'GET',
          `/boards/${team.boardId}/sprints`,
          team.guest.token,
        ),
      ),
    );
    expect(body.items.map((item) => item.number)).toEqual([2, 1]);
    expect(body.items[0]).toMatchObject({
      state: 'active',
      scopeSp: 7,
      doneSp: 0,
    });
    expect(body.items[1]).toMatchObject({
      state: 'closed',
      scopeSp: 2,
      doneSp: 2,
    });

    const limited = await json(
      await t.request(
        'GET',
        `/boards/${team.boardId}/sprints?limit=1`,
        team.guest.token,
      ),
    );
    expect(limited.items).toHaveLength(1);
  });

  it('KPI активного спринта считает текущие SP и velocity по закрытым', async () => {
    await createTask(t, team, { sp: 4, status: 'done' });
    t.clock.current = AFTER_SPRINT;
    const task = await createTask(t, team, { sp: 1 });
    await moveTask(t, team.admin.token, task.key, 'done');
    await t.request('PATCH', `/tasks/${task.key}`, team.admin.token, { sp: 3 });

    const kpi = await json(
      await t.request(
        'GET',
        `/boards/${team.boardId}/sprints/2/kpi`,
        team.admin.token,
      ),
    );
    expect(kpi.summary.doneSp).toBe(3);
    expect(
      kpi.velocity.items.map((item: { number: number }) => item.number),
    ).toEqual([1, 2]);
    expect(kpi.velocity.averageDoneSp).toBe(4);
    expect(kpi.board.id).toBe(team.boardId);
    expect(kpi.serverTime).toBe(AFTER_SPRINT.toISOString());
  });
});
