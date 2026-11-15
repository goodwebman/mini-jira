import { taskCommentSchema, taskDetailSchema } from '@gwmt/contracts';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { taskComments } from '../src/db/schema.js';
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

  it('БД запрещает родителя из другой задачи даже в обход API', async () => {
    const task = await createTask(t, team);
    const other = await createTask(t, team);
    const root = taskCommentSchema.parse(
      await json(await comment(task.key, team.worker.token, 'Начало')),
    );
    await expect(
      t.db.insert(taskComments).values({
        taskId: other.id,
        authorId: team.worker.id,
        parentId: root.id,
        text: 'Неверная связь',
      }),
    ).rejects.toThrow();
    await expect(
      t.db.insert(taskComments).values({
        taskId: task.id,
        authorId: team.worker.id,
        parentId: crypto.randomUUID(),
        text: 'Нет родителя',
      }),
    ).rejects.toThrow();
  });

  it('ответы на свои и чужие комментарии сохраняются на любой глубине', async () => {
    const task = await createTask(t, team);
    const root = taskCommentSchema.parse(
      await json(await comment(task.key, team.worker.token, 'Начало')),
    );
    expect(root.parentId).toBeNull();
    let parent = root;
    const discussion = [root];
    for (let depth = 0; depth < 12; depth += 1) {
      const author = depth % 3 === 0 ? team.admin : team.worker;
      const response = await t.request(
        'POST',
        `/tasks/${task.key}/comments`,
        author.token,
        {
          text: `Ответ ${depth}`,
          parentId: parent.id,
        },
      );
      expect(response.status).toBe(201);
      const reply = taskCommentSchema.parse(await json(response));
      expect(reply.parentId).toBe(parent.id);
      expect(reply.author.id).toBe(author.id);
      discussion.push(reply);
      parent = reply;
      t.advance(1000);
    }
    const detail = taskDetailSchema.parse(
      await json(
        await t.request('GET', `/tasks/${task.key}`, team.guest.token),
      ),
    );
    expect(detail.comments).toEqual(expect.arrayContaining(discussion));
    expect(detail.comments).toHaveLength(discussion.length);
  });

  it('нельзя ответить на отсутствующий комментарий или комментарий другой задачи', async () => {
    const task = await createTask(t, team);
    const other = await createTask(t, team);
    const foreign = taskCommentSchema.parse(
      await json(await comment(other.key, team.worker.token, 'Другая задача')),
    );
    const outsider = await createTeam(t);
    const privateTask = await createTask(t, outsider);
    const privateComment = taskCommentSchema.parse(
      await json(
        await comment(privateTask.key, outsider.worker.token, 'Другая доска'),
      ),
    );
    for (const parentId of [
      crypto.randomUUID(),
      foreign.id,
      privateComment.id,
      'invalid',
      null,
    ]) {
      const response = await t.request(
        'POST',
        `/tasks/${task.key}/comments`,
        team.worker.token,
        { text: 'Ответ', parentId },
      );
      expect(response.status).toBe(422);
      expect(await errorCode(response)).toBe('VALIDATION_ERROR');
    }
    const detail = taskDetailSchema.parse(
      await json(
        await t.request('GET', `/tasks/${task.key}`, team.worker.token),
      ),
    );
    expect(detail.comments).toEqual([]);
  });

  it('гость не может ответить даже на существующий комментарий', async () => {
    const task = await createTask(t, team);
    const root = taskCommentSchema.parse(
      await json(await comment(task.key, team.worker.token, 'Начало')),
    );
    const response = await t.request(
      'POST',
      `/tasks/${task.key}/comments`,
      team.guest.token,
      { text: 'Ответ', parentId: root.id },
    );
    expect(response.status).toBe(403);
    expect(await errorCode(response)).toBe('ROLE_FORBIDDEN');
  });

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
