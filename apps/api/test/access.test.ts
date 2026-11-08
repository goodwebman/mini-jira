import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTask, createTeam, errorCode, taskBody, type Team } from './fixtures.js';
import { createTestApp, createUser, json, type TestApp, type TestUser } from './helpers.js';

interface Ctx {
  team: Team;
  key: string;
  targetKey: string;
  outsider: TestUser;
}

type Endpoint = [string, string, (ctx: Ctx) => [string, unknown?]];

const boardEndpoints: Endpoint[] = [
  ['GET', 'деталь доски', ({ team }) => [`/boards/${team.boardId}`]],
  ['PUT', 'избранное', ({ team }) => [`/boards/${team.boardId}/favorite`]],
  ['DELETE', 'избранное', ({ team }) => [`/boards/${team.boardId}/favorite`]],
  ['POST', 'участники', ({ team, outsider }) => [`/boards/${team.boardId}/members`, { userId: outsider.id }]],
  ['PATCH', 'участник', ({ team }) => [`/boards/${team.boardId}/members/${team.worker.id}`, { role: 'guest' }]],
  ['DELETE', 'участник', ({ team }) => [`/boards/${team.boardId}/members/${team.worker.id}`]],
  ['GET', 'задачи доски', ({ team }) => [`/boards/${team.boardId}/tasks`]],
  ['POST', 'создание задачи', ({ team }) => [`/boards/${team.boardId}/tasks`, taskBody(team)]],
  ['GET', 'спринты', ({ team }) => [`/boards/${team.boardId}/sprints`]],
  ['GET', 'KPI', ({ team }) => [`/boards/${team.boardId}/sprints/1/kpi`]],
];

const taskEndpoints: Endpoint[] = [
  ['GET', 'деталь задачи', ({ key }) => [`/tasks/${key}`]],
  ['PATCH', 'правка задачи', ({ key }) => [`/tasks/${key}`, { status: 'work' }]],
  ['PUT', 'запрет', ({ key }) => [`/tasks/${key}/take-lock`]],
  ['DELETE', 'запрет', ({ key }) => [`/tasks/${key}/take-lock`]],
  ['POST', 'пауза', ({ key }) => [`/tasks/${key}/pause`]],
  ['POST', 'снятие паузы', ({ key }) => [`/tasks/${key}/resume`]],
  ['POST', 'связь', ({ key, targetKey }) => [`/tasks/${key}/links`, { type: 'rel', targetKey }]],
  ['DELETE', 'связь', ({ key, targetKey }) => [`/tasks/${key}/links/${targetKey}`]],
  ['POST', 'комментарий', ({ key }) => [`/tasks/${key}/comments`, { text: 'Текст' }]],
];

const otherProtected: [string, string, unknown?][] = [
  ['GET', '/me'],
  ['PATCH', '/me', {}],
  ['POST', '/me/password', { newPassword: 'new-password' }],
  ['GET', '/me/nav-summary'],
  ['GET', '/me/task-stats'],
  ['GET', '/me/tasks'],
  ['GET', '/users/search'],
  ['GET', '/boards'],
  ['POST', '/boards', { name: 'x', key: 'X', memberIds: [] }],
  ['GET', '/tasks/search'],
];

describe('доступ', () => {
  let t: TestApp;
  let ctx: Ctx;

  beforeAll(async () => {
    t = await createTestApp();
    const team = await createTeam(t);
    const task = await createTask(t, team);
    const target = await createTask(t, team);
    ctx = { team, key: task.key, targetKey: target.key, outsider: await createUser(t) };
  });

  afterAll(() => t.close());

  describe('не участник получает 404', () => {
    it.each(boardEndpoints)('%s %s', async (method, _name, build) => {
      const [path, body] = build(ctx);
      const res = await t.request(method, path, ctx.outsider.token, body);
      expect(res.status).toBe(404);
      expect(await errorCode(res)).toBe('BOARD_NOT_FOUND');
    });

    it.each(taskEndpoints)('%s %s', async (method, _name, build) => {
      const [path, body] = build(ctx);
      const res = await t.request(method, path, ctx.outsider.token, body);
      expect(res.status).toBe(404);
      expect(await errorCode(res)).toBe('TASK_NOT_FOUND');
    });

    it('несуществующая доска и задача неотличимы от чужих', async () => {
      const board = await t.request('GET', '/boards/999999', ctx.outsider.token);
      expect(board.status).toBe(404);
      expect(await errorCode(board)).toBe('BOARD_NOT_FOUND');
      const task = await t.request('GET', '/tasks/NOPE-1', ctx.outsider.token);
      expect(task.status).toBe(404);
      expect(await errorCode(task)).toBe('TASK_NOT_FOUND');
    });

    it('невалидное тело не раскрывает доску: сначала членство', async () => {
      const res = await t.request('POST', `/boards/${ctx.team.boardId}/tasks`, ctx.outsider.token, {});
      expect(res.status).toBe(404);
    });
  });

  describe('без токена 401', () => {
    it.each([...boardEndpoints, ...taskEndpoints])('%s %s', async (method, _name, build) => {
      const [path, body] = build(ctx);
      const res = await t.request(method, path, null, body);
      expect(res.status).toBe(401);
      expect(await errorCode(res)).toBe('ACCESS_TOKEN_MISSING');
    });

    it.each(otherProtected)('%s %s', async (method, path, body) => {
      const res = await t.request(method, path, null, body);
      expect(res.status).toBe(401);
      expect(await errorCode(res)).toBe('ACCESS_TOKEN_MISSING');
    });
  });

  it('неверный ключ задачи в пути даёт 400 после проверки токена', async () => {
    expect(await errorCode(await t.request('GET', '/tasks/lower-1', ctx.outsider.token))).toBe('BAD_REQUEST');
    expect((await t.request('GET', '/tasks/lower-1', null)).status).toBe(401);
  });

  it('удалённый участник не видит задачи доски в моих задачах и статистике', async () => {
    const team = await createTeam(t);
    const task = await createTask(t, team, { authorId: team.worker.id });

    const before = await json(await t.request('GET', '/me/tasks', team.worker.token));
    expect(before.items.map((item: { key: string }) => item.key)).toContain(task.key);
    expect((await json(await t.request('GET', '/me/task-stats', team.worker.token))).open).toBe(1);

    const removed = await t.request(
      'DELETE',
      `/boards/${team.boardId}/members/${team.worker.id}`,
      team.admin.token,
    );
    expect(removed.status).toBe(204);

    const after = await json(await t.request('GET', '/me/tasks', team.worker.token));
    expect(after.items).toEqual([]);
    expect(after.summary).toEqual({ totalCount: 0, totalSp: 0 });
    const stats = await json(await t.request('GET', '/me/task-stats', team.worker.token));
    expect(stats).toEqual({ open: 0, closed: 0, totalSp: 0, nextOpen: [] });

    const detail = await json(await t.request('GET', `/tasks/${task.key}`, team.admin.token));
    expect(detail.people.author.id).toBe(team.worker.id);
  });

  it('ответ на ошибке содержит requestId из заголовка', async () => {
    const res = await t.request('GET', '/boards/999999', ctx.outsider.token);
    const { error } = await json(res);
    expect(error.requestId).toBe(res.headers.get('X-Request-Id'));
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
