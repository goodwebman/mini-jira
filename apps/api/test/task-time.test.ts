import { taskCardSchema, taskDetailSchema } from '@gwmt/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type Team, createTask, createTeam, moveTask } from './fixtures.js';
import { type TestApp, createTestApp, json } from './helpers.js';

describe('история времени задачи', () => {
  let t: TestApp;
  let team: Team;
  beforeAll(async () => {
    t = await createTestApp();
    team = await createTeam(t);
  });
  afterAll(() => t.close());

  const detail = async (key: string) =>
    taskDetailSchema.parse(
      await json(await t.request('GET', `/tasks/${key}`, team.guest.token)),
    );
  const action = (key: string, name: string) =>
    t.request('POST', `/tasks/${key}/${name}`, team.worker.token);

  it('сохраняет все взятия, участников и даты пауз; считает работу без ожидания и пауз', async () => {
    const task = await createTask(t, team);
    t.advance(3600_000);
    const firstStart = t.clock.current.toISOString();
    await moveTask(t, team.worker.token, task.key, 'work');
    t.advance(30 * 60_000);
    const pauseStart = t.clock.current.toISOString();
    await action(task.key, 'pause');
    t.advance(15 * 60_000);
    const pauseEnd = t.clock.current.toISOString();
    await action(task.key, 'resume');
    t.advance(45 * 60_000);
    await moveTask(t, team.admin.token, task.key, 'review');
    await action(task.key, 'pause');
    t.advance(10 * 60_000);
    const secondStart = t.clock.current.toISOString();
    await moveTask(t, team.admin.token, task.key, 'work');
    t.advance(30 * 60_000);
    const done = taskCardSchema.parse(
      await json(await moveTask(t, team.admin.token, task.key, 'done')),
    );
    expect(done.timer.spentSec).toBe(6300);
    t.advance(86_400_000);
    const result = await detail(task.key);
    expect(result.timer.spentSec).toBe(6300);
    expect(result.timeHistory.map((interval) => interval.status)).toEqual([
      'todo',
      'work',
      'review',
      'work',
      'done',
    ]);
    expect(result.timeHistory[1]).toMatchObject({
      enteredAt: firstStart,
      pausedSec: 900,
      changedBy: { id: team.worker.id },
      pauses: [{ startedAt: pauseStart, endedAt: pauseEnd }],
    });
    expect(result.timeHistory[2]).toMatchObject({
      pausedSec: 600,
      pauses: [{ endedAt: secondStart }],
    });
    expect(
      result.timeHistory.filter((interval) => interval.status === 'work'),
    ).toHaveLength(2);
    expect(result.timeHistory.at(-1)?.leftAt).toBeNull();
    const board = await json(
      await t.request(
        'GET',
        `/boards/${team.boardId}/tasks`,
        team.worker.token,
      ),
    );
    expect(
      board.items.find((item: { key: string }) => item.key === task.key).timer
        .spentSec,
    ).toBe(6300);
    const mine = await json(
      await t.request('GET', '/me/tasks', team.worker.token),
    );
    expect(
      mine.items.find((item: { key: string }) => item.key === task.key).timer
        .spentSec,
    ).toBe(6300);
  });

  it('повторные pause/resume не дублируют историю; текущая пауза открыта', async () => {
    const task = await createTask(t, team, { status: 'work' });
    t.advance(60_000);
    await action(task.key, 'pause');
    t.advance(60_000);
    await action(task.key, 'pause');
    const paused = await detail(task.key);
    expect(paused.timeHistory[0]?.pauses).toHaveLength(1);
    expect(paused.timeHistory[0]?.pauses[0]?.endedAt).toBeNull();
    expect(paused.timeHistory[0]?.pausedSec).toBe(0);
    expect(paused.timer.spentSec).toBe(0);
    await action(task.key, 'resume');
    await action(task.key, 'resume');
    t.advance(60_000);
    await action(task.key, 'pause');
    t.advance(120_000);
    await action(task.key, 'resume');
    const resumed = await detail(task.key);
    expect(resumed.timeHistory[0]?.pauses).toHaveLength(2);
    expect(resumed.timeHistory[0]?.pausedSec).toBe(180);
    expect(
      resumed.timeHistory[0]?.pauses.every((pause) => pause.endedAt !== null),
    ).toBe(true);
  });
});
