import { taskCommentSchema, taskDetailSchema } from '@gwmt/contracts';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { type Team, createTask, createTeam, errorCode } from './fixtures.js';
import { DEFAULT_NOW, type TestApp, createTestApp, json } from './helpers.js';

/**
 * Комментарии задачи.
 *
 * Тесткейсы: ответ — готовый комментарий с автором и временем сервера; деталь
 * отдаёт обсуждение от старых к новым; пустой текст — 422; гость не пишет;
 * чужая задача не видна.
 */
describe('комментарии', () => {
  let t: TestApp;
  let team: Team;

  beforeAll(async () => {
    t = await createTestApp();
    team = await createTeam(t);
  });

  afterEach(() => {
    t.clock.current = DEFAULT_NOW;
  });

  afterAll(() => t.close());

  const comment = (key: string, token: string, text: string) =>
    t.request('POST', `/tasks/${key}/comments`, token, { text });

  it('ответ — готовый комментарий с автором и временем сервера', async () => {
    const task = await createTask(t, team);
    const res = await comment(task.key, team.worker.token, '  Готово к ревью ');

    expect(res.status).toBe(201);
    const created = taskCommentSchema.parse(await json(res));
    expect(created.text).toBe('Готово к ревью');
    expect(created.author.id).toBe(team.worker.id);
    expect(created.createdAt).toBe(t.clock.current.toISOString());
  });

  it('деталь задачи отдаёт обсуждение от старых к новым', async () => {
    const task = await createTask(t, team);
    await comment(task.key, team.worker.token, 'Первый');
    t.advance(1000);
    await comment(task.key, team.admin.token, 'Второй');

    const detail = taskDetailSchema.parse(
      await json(
        await t.request('GET', `/tasks/${task.key}`, team.guest.token),
      ),
    );
    expect(detail.comments.map((c) => [c.text, c.author.id])).toEqual([
      ['Первый', team.worker.id],
      ['Второй', team.admin.id],
    ]);
  });

  it('пустой комментарий даёт 422', async () => {
    const task = await createTask(t, team);
    const res = await comment(task.key, team.worker.token, '   ');
    expect(res.status).toBe(422);
  });

  it('гость читает, но не пишет', async () => {
    const task = await createTask(t, team);
    const res = await comment(task.key, team.guest.token, 'Можно?');
    expect(res.status).toBe(403);
    expect(await errorCode(res)).toBe('ROLE_FORBIDDEN');
  });

  it('задача чужой доски для постороннего не существует', async () => {
    const task = await createTask(t, team);
    const outsider = await createTeam(t);
    const res = await comment(task.key, outsider.worker.token, 'Привет');
    expect(res.status).toBe(404);
    expect(await errorCode(res)).toBe('TASK_NOT_FOUND');
  });
});
