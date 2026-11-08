import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  boardTasksResponseSchema,
  myTaskStatsSchema,
  myTasksResponseSchema,
  navSummarySchema,
  taskCardSchema,
  taskDetailSchema,
} from '@gwmt/contracts';
import { taskStatusIntervals } from '../src/db/schema.js';
import { createTask, createTeam, errorCode, moveTask, taskBody, type Team } from './fixtures.js';
import { createTestApp, createUser, DEFAULT_NOW, json, type TestApp } from './helpers.js';

describe('задачи', () => {
  let t: TestApp;
  let team: Team;

  const intervalsOf = (taskId: string) =>
    t.db
      .select()
      .from(taskStatusIntervals)
      .where(eq(taskStatusIntervals.taskId, taskId))
      .orderBy(taskStatusIntervals.enteredAt);

  beforeAll(async () => {
    t = await createTestApp();
    team = await createTeam(t);
  });

  afterEach(() => {
    t.clock.current = DEFAULT_NOW;
  });

  afterAll(() => t.close());

  describe('создание', () => {
    it('первая задача получает номер 101, ответ соответствует контракту', async () => {
      const local = await createTeam(t);
      const task = taskCardSchema.parse(await createTask(t, local));
      expect(task.key).toBe(`${local.boardKey}-101`);
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('med');
      expect(task.timer).toMatchObject({ canPause: false, pausedAt: null, completedInDays: null });
    });

    it('параллельные создания не дают дублей', async () => {
      const local = await createTeam(t);
      const cards = await Promise.all(Array.from({ length: 8 }, () => createTask(t, local)));
      const keys = cards.map((card) => card.key);
      expect(new Set(keys).size).toBe(8);
      expect(keys.sort()).toEqual(
        Array.from({ length: 8 }, (_, index) => `${local.boardKey}-${101 + index}`),
      );
    });

    it('без ревьювера или с sp: 0 даёт 422 с fields', async () => {
      const noReviewer = await t.request(
        'POST',
        `/boards/${team.boardId}/tasks`,
        team.admin.token,
        taskBody(team, { reviewerId: undefined }),
      );
      expect(noReviewer.status).toBe(422);
      expect((await json(noReviewer)).error.fields.reviewerId).toBe('Выберите ревьювера');

      const zero = await t.request('POST', `/boards/${team.boardId}/tasks`, team.admin.token, taskBody(team, { sp: 0 }));
      expect(zero.status).toBe(422);
      expect((await json(zero)).error.fields.sp).toBe('Введите число больше 0');
    });

    it('создание пишет первый интервал', async () => {
      const task = await createTask(t, team);
      const intervals = await intervalsOf(task.id);
      expect(intervals).toHaveLength(1);
      expect(intervals[0]).toMatchObject({ status: 'todo', leftAt: null, pausedSec: 0 });
    });

    it('sp приходит числом', async () => {
      const task = await createTask(t, team, { sp: 2.5 });
      expect(task.sp).toBe(2.5);
    });
  });

  describe('смена статуса', () => {
    it('создаёт интервал и сбрасывает паузу', async () => {
      const task = await createTask(t, team, { status: 'work' });
      await t.request('POST', `/tasks/${task.key}/pause`, team.worker.token);
      t.advance(120_000);

      const card = await json(await moveTask(t, team.worker.token, task.key, 'review'));
      expect(card.status).toBe('review');
      expect(card.timer).toMatchObject({
        statusEnteredAt: t.clock.current.toISOString(),
        pausedAt: null,
        pausedTotalSec: 0,
      });

      const intervals = await intervalsOf(task.id);
      expect(intervals).toHaveLength(2);
      expect(intervals[0]).toMatchObject({ status: 'work', pausedSec: 120 });
      expect(intervals[0]?.leftAt).not.toBeNull();
      expect(intervals[1]).toMatchObject({ status: 'review', leftAt: null });
    });

    it('тот же статус ничего не меняет', async () => {
      const task = await createTask(t, team, { status: 'work' });
      await t.request('POST', `/tasks/${task.key}/pause`, team.worker.token);
      t.advance(60_000);

      const card = await json(await moveTask(t, team.worker.token, task.key, 'work'));
      expect(card.timer.pausedAt).not.toBeNull();
      expect(card.timer.statusEnteredAt).toBe(task.timer.statusEnteredAt);
      expect(await intervalsOf(task.id)).toHaveLength(1);
    });

    it('completedInDays заполняется при входе в done и обнуляется при выходе', async () => {
      const task = await createTask(t, team); // понедельник
      await moveTask(t, team.admin.token, task.key, 'work');
      t.advance(2 * 86_400_000); // среда
      const done = await json(await moveTask(t, team.admin.token, task.key, 'done'));
      expect(done.timer.completedInDays).toBe(3);

      const back = await json(await moveTask(t, team.admin.token, task.key, 'test'));
      expect(back.timer.completedInDays).toBeNull();
    });

    it('минимум один день', async () => {
      const task = await createTask(t, team);
      const done = await json(await moveTask(t, team.admin.token, task.key, 'done'));
      expect(done.timer.completedInDays).toBe(1);
    });
  });

  describe('пауза', () => {
    it.each(['todo', 'done'])('в %s даёт 409', async (status) => {
      const task = await createTask(t, team, { status });
      const res = await t.request('POST', `/tasks/${task.key}/pause`, team.worker.token);
      expect(res.status).toBe(409);
      expect(await errorCode(res)).toBe('TASK_NOT_PAUSABLE');
    });

    it('повторная пауза и resume без паузы возвращают 200 без изменений', async () => {
      const task = await createTask(t, team, { status: 'review' });
      const first = await json(await t.request('POST', `/tasks/${task.key}/pause`, team.worker.token));
      t.advance(30_000);
      const second = await t.request('POST', `/tasks/${task.key}/pause`, team.worker.token);
      expect(second.status).toBe(200);
      expect((await json(second)).timer.pausedAt).toBe(first.timer.pausedAt);

      const other = await createTask(t, team, { status: 'review' });
      const resume = await t.request('POST', `/tasks/${other.key}/resume`, team.worker.token);
      expect(resume.status).toBe(200);
      expect((await json(resume)).timer.pausedTotalSec).toBe(0);
    });

    it('resume копит время в задаче и в интервале', async () => {
      const task = await createTask(t, team, { status: 'test' });
      await t.request('POST', `/tasks/${task.key}/pause`, team.worker.token);
      t.advance(90_000);
      const card = await json(await t.request('POST', `/tasks/${task.key}/resume`, team.worker.token));
      expect(card.timer).toMatchObject({ pausedAt: null, pausedTotalSec: 90 });
      expect((await intervalsOf(task.id))[0]?.pausedSec).toBe(90);
    });
  });

  describe('связи', () => {
    const link = (key: string, type: string, targetKey: string) =>
      t.request('POST', `/tasks/${key}/links`, team.worker.token, { type, targetKey });
    const links = async (key: string) =>
      (await json(await t.request('GET', `/tasks/${key}`, team.worker.token))).links;

    it('создаёт обратную сторону правильного типа', async () => {
      const [a, b] = [await createTask(t, team), await createTask(t, team)];
      const res = await link(a.key, 'blocks', b.key);
      expect(res.status).toBe(201);
      expect((await json(res)).type).toBe('blocks');
      expect((await links(b.key))[0]).toMatchObject({ type: 'blockedBy', task: { key: a.key, canOpen: true } });
    });

    it('удаление убирает обе стороны', async () => {
      const [a, b] = [await createTask(t, team), await createTask(t, team)];
      await link(a.key, 'rel', b.key);
      expect((await t.request('DELETE', `/tasks/${b.key}/links/${a.key}`, team.worker.token)).status).toBe(204);
      expect(await links(a.key)).toEqual([]);
      expect(await links(b.key)).toEqual([]);
    });

    it('повтор любого типа даёт 409, в обе стороны', async () => {
      const [a, b] = [await createTask(t, team), await createTask(t, team)];
      await link(a.key, 'rel', b.key);
      const repeat = await link(a.key, 'dup', b.key);
      expect(repeat.status).toBe(409);
      expect(await errorCode(repeat)).toBe('TASK_LINK_EXISTS');
      expect((await link(b.key, 'blocks', a.key)).status).toBe(409);
    });

    it('сама на себя даёт 422', async () => {
      const a = await createTask(t, team);
      const res = await link(a.key, 'rel', a.key);
      expect(res.status).toBe(422);
      expect(await errorCode(res)).toBe('TASK_LINK_SELF');
    });

    it('несуществующая цель даёт TASK_NOT_FOUND', async () => {
      const a = await createTask(t, team);
      const res = await link(a.key, 'rel', 'NOPE-1');
      expect(res.status).toBe(404);
      expect(await errorCode(res)).toBe('TASK_NOT_FOUND');
    });

    it('isBlocked выключается, когда блокирующая задача ушла в done', async () => {
      const [blocker, blocked] = [await createTask(t, team), await createTask(t, team)];
      await link(blocker.key, 'blocks', blocked.key);

      const before = await json(await t.request('GET', `/tasks/${blocked.key}`, team.worker.token));
      expect(before.isBlocked).toBe(true);
      expect(before.linkCount).toBe(1);

      await moveTask(t, team.admin.token, blocker.key, 'done');
      const after = await json(await t.request('GET', `/tasks/${blocked.key}`, team.worker.token));
      expect(after.isBlocked).toBe(false);
    });

    describe('между досками', () => {
      it('нужна роль на обеих досках', async () => {
        const other = await createTeam(t);
        const foreign = await createTask(t, other);
        const a = await createTask(t, team);

        const notMember = await link(a.key, 'rel', foreign.key);
        expect(notMember.status).toBe(404);
        expect(await errorCode(notMember)).toBe('TASK_NOT_FOUND');

        await t.request('POST', `/boards/${other.boardId}/members`, other.admin.token, {
          userId: team.worker.id,
          role: 'guest',
        });
        const guest = await link(a.key, 'rel', foreign.key);
        expect(guest.status).toBe(403);
        expect(await errorCode(guest)).toBe('ROLE_FORBIDDEN');

        await t.request('PATCH', `/boards/${other.boardId}/members/${team.worker.id}`, other.admin.token, {
          role: 'worker',
        });
        expect((await link(a.key, 'rel', foreign.key)).status).toBe(201);
      });

      it('canOpen показывает доступ к чужой доске', async () => {
        const other = await createTeam(t);
        const foreign = await createTask(t, other);
        const a = await createTask(t, team);
        await t.request('POST', `/boards/${other.boardId}/members`, other.admin.token, { userId: team.worker.id });
        await link(a.key, 'rel', foreign.key);

        const asWorker = await json(await t.request('GET', `/tasks/${a.key}`, team.worker.token));
        expect(asWorker.links[0].task.canOpen).toBe(true);
        const asAdmin = await json(await t.request('GET', `/tasks/${a.key}`, team.admin.token));
        expect(asAdmin.links[0].task.canOpen).toBe(false);
      });
    });
  });

  describe('деталь и комментарии', () => {
    it('деталь соответствует контракту, комментарии от старых к новым', async () => {
      const task = await createTask(t, team, { description: 'Описание' });
      const first = await t.request('POST', `/tasks/${task.key}/comments`, team.worker.token, { text: '  Первый ' });
      expect(first.status).toBe(201);
      expect((await json(first)).text).toBe('Первый');
      t.advance(1000);
      await t.request('POST', `/tasks/${task.key}/comments`, team.admin.token, { text: 'Второй' });

      const detail = taskDetailSchema.parse(await json(await t.request('GET', `/tasks/${task.key}`, team.guest.token)));
      expect(detail.description).toBe('Описание');
      expect(detail.myRole).toBe('guest');
      expect(detail.comments.map((c) => c.text)).toEqual(['Первый', 'Второй']);
      expect(detail.serverTime).toBe(t.clock.current.toISOString());
      expect(detail.board.key).toBe(team.boardKey);
      expect(detail.sprint.state).toBe('active');
    });

    it('пустой комментарий даёт 422', async () => {
      const task = await createTask(t, team);
      const res = await t.request('POST', `/tasks/${task.key}/comments`, team.worker.token, { text: '   ' });
      expect(res.status).toBe(422);
    });

    it('assigneeOptions без гостей, но с нынешними ролями', async () => {
      const local = await createTeam(t);
      const task = await createTask(t, local, { authorId: local.worker.id });
      await t.request('DELETE', `/boards/${local.boardId}/members/${local.worker.id}`, local.admin.token);

      const detail = await json(await t.request('GET', `/tasks/${task.key}`, local.admin.token));
      const ids = detail.assigneeOptions.map((u: { id: string }) => u.id);
      expect(ids).toContain(local.worker.id);
      expect(ids).toContain(local.admin.id);
      expect(ids).not.toContain(local.guest.id);
    });
  });

  describe('задачи доски', () => {
    it('весь спринт по createdAt, затем по номеру', async () => {
      const local = await createTeam(t);
      const first = await createTask(t, local);
      t.advance(1000);
      const second = await createTask(t, local);
      const body = boardTasksResponseSchema.parse(
        await json(await t.request('GET', `/boards/${local.boardId}/tasks`, local.guest.token)),
      );
      expect(body.items.map((item) => item.key)).toEqual([first.key, second.key]);
      expect(body.sprint.number).toBe(1);
    });
  });

  describe('поиск', () => {
    it('по умолчанию 6, по updated_at убыв., без самой задачи и связанных', async () => {
      const local = await createTeam(t);
      const cards = [];
      for (let index = 0; index < 8; index += 1) {
        cards.push(await createTask(t, local));
        t.advance(1000);
      }
      const asc = cards.map((card) => card.key);
      const res = await json(await t.request('GET', '/tasks/search', local.worker.token));
      expect(res.items.map((i: { key: string }) => i.key)).toEqual(asc.toReversed().slice(0, 6));

      await t.request('POST', `/tasks/${asc[7]}/links`, local.worker.token, { type: 'rel', targetKey: asc[6] });
      const excluded = await json(await t.request('GET', `/tasks/search?excludeLinkedTo=${asc[7]}&limit=20`, local.worker.token));
      const keys = excluded.items.map((i: { key: string }) => i.key);
      expect(keys).not.toContain(asc[7]);
      expect(keys).not.toContain(asc[6]);
      expect(keys).toContain(asc[5]);
    });

    it('limit больше 20 даёт 422', async () => {
      expect((await t.request('GET', '/tasks/search?limit=21', team.worker.token)).status).toBe(422);
    });

    it('ищет по ключу', async () => {
      const local = await createTeam(t);
      const task = await createTask(t, local);
      const res = await json(await t.request('GET', `/tasks/search?q=${task.key}`, local.worker.token));
      expect(res.items.map((i: { key: string }) => i.key)).toEqual([task.key]);
      expect(res.items[0].board).toEqual({ id: local.boardId, name: expect.any(String) });
    });
  });

  describe('мои задачи', () => {
    let local: Team;
    let cards: Record<string, { key: string }>;

    beforeAll(async () => {
      local = await createTeam(t);
      cards = {};
      for (const status of ['done', 'todo', 'test', 'review', 'work']) {
        cards[status] = await createTask(t, local, { status, sp: 1.5, title: `Статус ${status}` });
      }
    });

    it('порядок work, review, test, todo, done', async () => {
      const body = myTasksResponseSchema.parse(await json(await t.request('GET', '/me/tasks', local.worker.token)));
      expect(body.items.map((item) => item.status)).toEqual(['work', 'review', 'test', 'todo', 'done']);
      expect(body.items[0]?.roles).toEqual(['author']);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(50);
    });

    it('total учитывает фильтры, summary нет', async () => {
      const body = await json(await t.request('GET', '/me/tasks?status=work', local.worker.token));
      expect(body.total).toBe(1);
      expect(body.summary).toEqual({ totalCount: 5, totalSp: 7.5 });
    });

    it('роль, q и пагинация', async () => {
      const asReviewer = await json(await t.request('GET', '/me/tasks?role=reviewer', local.worker.token));
      expect(asReviewer.total).toBe(0);
      const found = await json(await t.request('GET', `/me/tasks?q=${encodeURIComponent('статус test')}`, local.worker.token));
      expect(found.items.map((i: { key: string }) => i.key)).toEqual([cards.test!.key]);
      const byKey = await json(await t.request('GET', `/me/tasks?q=${cards.done!.key}`, local.worker.token));
      expect(byKey.total).toBe(1);
      const page2 = await json(await t.request('GET', '/me/tasks?page=2&pageSize=2', local.worker.token));
      expect(page2.items.map((i: { status: string }) => i.status)).toEqual(['test', 'todo']);
      expect(page2.total).toBe(5);
    });

    it('pageSize больше 100 даёт 422', async () => {
      expect((await t.request('GET', '/me/tasks?pageSize=101', local.worker.token)).status).toBe(422);
    });

    it('номер сортируется как число', async () => {
      const crowd = await createTeam(t);
      const created = [];
      for (let index = 0; index < 12; index += 1) created.push(await createTask(t, crowd));
      const body = await json(await t.request('GET', '/me/tasks?pageSize=100', crowd.worker.token));
      expect(body.items.map((i: { key: string }) => i.key)).toEqual(created.map((c) => c.key));
    });

    it('task-stats считает открытые, закрытые и SP', async () => {
      const stats = myTaskStatsSchema.parse(await json(await t.request('GET', '/me/task-stats', local.worker.token)));
      expect(stats.open).toBe(4);
      expect(stats.closed).toBe(1);
      expect(stats.totalSp).toBe(7.5);
      expect(stats.nextOpen).toHaveLength(4);
      expect(stats.nextOpen[0]?.key).toBe(cards.work!.key);
    });

    it('nav-summary по доске, с плитками и KPI', async () => {
      const body = navSummarySchema.parse(
        await json(await t.request('GET', `/me/nav-summary?boardId=${local.boardId}`, local.worker.token)),
      );
      expect(body.board).toMatchObject({
        id: local.boardId,
        sprintNumber: 1,
        statusCounts: { todo: 1, work: 1, review: 1, test: 1, done: 1 },
      });
      expect(body.myTasks).toMatchObject({ openCount: 4, openSp: 6 });
      expect(body.myTasks.next).toHaveLength(3);
      expect(body.kpi).toMatchObject({ sprintNumber: 1, donePct: 20 });
      expect(body.kpi?.remaining).toHaveLength(1);
    });

    it('nav-summary без досок: board и kpi равны null', async () => {
      const newcomer = await createUser(t);
      expect(await json(await t.request('GET', '/me/nav-summary', newcomer.token))).toEqual({
        boardsTotal: 0,
        board: null,
        myTasks: { openCount: 0, openSp: 0, next: [] },
        kpi: null,
      });
    });

    it('nav-summary без boardId берёт доску, куда добавили последней', async () => {
      const user = await createUser(t);
      const first = await createTeam(t);
      await t.request('POST', `/boards/${first.boardId}/members`, first.admin.token, { userId: user.id });
      t.advance(1000);
      const second = await createTeam(t);
      await t.request('POST', `/boards/${second.boardId}/members`, second.admin.token, { userId: user.id });

      const body = await json(await t.request('GET', '/me/nav-summary', user.token));
      expect(body.board.id).toBe(second.boardId);
      expect(body.boardsTotal).toBe(2);
    });

    it('nav-summary по чужой доске даёт 404', async () => {
      const user = await createUser(t);
      const res = await t.request('GET', `/me/nav-summary?boardId=${local.boardId}`, user.token);
      expect(res.status).toBe(404);
    });
  });

  it('правка задачи администратором меняет поля и людей', async () => {
    const task = await createTask(t, team);
    const res = await t.request('PATCH', `/tasks/${task.key}`, team.admin.token, {
      title: 'Новое',
      description: 'Текст',
      priority: 'crit',
      sp: 8,
      testerId: null,
      designerId: team.tester.id,
    });
    expect(res.status).toBe(200);
    const card = await json(res);
    expect(card).toMatchObject({ title: 'Новое', priority: 'crit', sp: 8 });
    expect(card.people.tester).toBeNull();
    expect(card.people.designer.id).toBe(team.tester.id);
  });
});
