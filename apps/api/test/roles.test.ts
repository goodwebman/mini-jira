import type { BoardRole } from '@gwmt/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  type Team,
  createTask,
  createTeam,
  errorCode,
  moveTask,
  setRole,
  taskBody,
} from './fixtures.js';
import { type TestApp, createTestApp, createUser, json } from './helpers.js';

const actorOf = (team: Team, role: BoardRole) =>
  role === 'admin' ? team.admin : role === 'worker' ? team.worker : team.guest;

type Case = [
  name: string,
  admin: number,
  worker: number,
  guest: number,
  run: (t: TestApp, team: Team, token: string) => Response | Promise<Response>,
];

const matrix: Case[] = [
  [
    'создать задачу',
    201,
    201,
    403,
    (t, team, token) =>
      t.request('POST', `/boards/${team.boardId}/tasks`, token, taskBody(team)),
  ],
  [
    'двигать статус',
    200,
    200,
    403,
    async (t, team, token) =>
      moveTask(t, token, (await createTask(t, team)).key, 'work'),
  ],
  [
    'менять поля задачи',
    200,
    403,
    403,
    async (t, team, token) =>
      t.request('PATCH', `/tasks/${(await createTask(t, team)).key}`, token, {
        priority: 'high',
      }),
  ],
  [
    'поставить запрет',
    200,
    403,
    403,
    async (t, team, token) =>
      t.request(
        'PUT',
        `/tasks/${(await createTask(t, team)).key}/take-lock`,
        token,
      ),
  ],
  [
    'снять запрет',
    200,
    403,
    403,
    async (t, team, token) =>
      t.request(
        'DELETE',
        `/tasks/${(await createTask(t, team)).key}/take-lock`,
        token,
      ),
  ],
  [
    'пауза',
    200,
    200,
    403,
    async (t, team, token) =>
      t.request(
        'POST',
        `/tasks/${(await createTask(t, team, { status: 'work' })).key}/pause`,
        token,
      ),
  ],
  [
    'снятие паузы',
    200,
    200,
    403,
    async (t, team, token) =>
      t.request(
        'POST',
        `/tasks/${(await createTask(t, team, { status: 'work' })).key}/resume`,
        token,
      ),
  ],
  [
    'комментарий',
    201,
    201,
    403,
    async (t, team, token) =>
      t.request(
        'POST',
        `/tasks/${(await createTask(t, team)).key}/comments`,
        token,
        { text: 'Текст' },
      ),
  ],
  [
    'связать задачи',
    201,
    201,
    403,
    async (t, team, token) => {
      const [a, b] = [await createTask(t, team), await createTask(t, team)];
      return t.request('POST', `/tasks/${a.key}/links`, token, {
        type: 'rel',
        targetKey: b.key,
      });
    },
  ],
  [
    'удалить связь',
    204,
    204,
    403,
    async (t, team, token) => {
      const [a, b] = [await createTask(t, team), await createTask(t, team)];
      await t.request('POST', `/tasks/${a.key}/links`, team.admin.token, {
        type: 'rel',
        targetKey: b.key,
      });
      return t.request('DELETE', `/tasks/${a.key}/links/${b.key}`, token);
    },
  ],
  [
    'добавить участника',
    201,
    403,
    403,
    async (t, team, token) =>
      t.request('POST', `/boards/${team.boardId}/members`, token, {
        userId: (await createUser(t)).id,
      }),
  ],
  [
    'поменять роль',
    200,
    403,
    403,
    (t, team, token) =>
      t.request(
        'PATCH',
        `/boards/${team.boardId}/members/${team.tester.id}`,
        token,
        { role: 'worker' },
      ),
  ],
  [
    'убрать участника',
    204,
    403,
    403,
    async (t, team, token) => {
      const user = await createUser(t);
      await t.request(
        'POST',
        `/boards/${team.boardId}/members`,
        team.admin.token,
        { userId: user.id },
      );
      return t.request(
        'DELETE',
        `/boards/${team.boardId}/members/${user.id}`,
        token,
      );
    },
  ],
];

describe('роли', () => {
  let t: TestApp;
  let team: Team;

  beforeAll(async () => {
    t = await createTestApp();
    team = await createTeam(t);
  });

  afterAll(() => t.close());

  describe.each(['admin', 'worker', 'guest'] as const)(
    'матрица: %s',
    (role) => {
      it.each(matrix)('%s', async (_name, admin, worker, guest, run) => {
        const expected = { admin, worker, guest }[role];
        const res = await run(t, team, actorOf(team, role).token);
        expect(res.status).toBe(expected);
        if (expected === 403)
          expect(await errorCode(res)).toBe('ROLE_FORBIDDEN');
      });
    },
  );

  describe('гость', () => {
    it('читает всё и пользуется избранным', async () => {
      const task = await createTask(t, team);
      const { boardId } = team;
      for (const path of [
        `/boards/${boardId}`,
        `/boards/${boardId}/tasks`,
        `/boards/${boardId}/sprints`,
        `/boards/${boardId}/sprints/1/kpi`,
        `/tasks/${task.key}`,
      ]) {
        expect(
          (await t.request('GET', path, team.guest.token)).status,
          path,
        ).toBe(200);
      }
      expect(
        (
          await t.request(
            'PUT',
            `/boards/${boardId}/favorite`,
            team.guest.token,
          )
        ).status,
      ).toBe(204);
      expect(
        (
          await t.request(
            'DELETE',
            `/boards/${boardId}/favorite`,
            team.guest.token,
          )
        ).status,
      ).toBe(204);
    });

    it('роль проверяется раньше данных', async () => {
      const task = await createTask(t, team);
      const res = await t.request(
        'PATCH',
        `/tasks/${task.key}`,
        team.guest.token,
        { sp: -1 },
      );
      expect(res.status).toBe(403);
      const create = await t.request(
        'POST',
        `/boards/${team.boardId}/tasks`,
        team.guest.token,
        {},
      );
      expect(create.status).toBe(403);
    });
  });

  describe('рабочий двигает статус', () => {
    it('todo в work и перепрыгивание этапа проходят', async () => {
      const first = await createTask(t, team);
      expect(
        (await moveTask(t, team.worker.token, first.key, 'work')).status,
      ).toBe(200);
      const second = await createTask(t, team);
      expect(
        (await moveTask(t, team.worker.token, second.key, 'test')).status,
      ).toBe(200);
    });

    it('шаг назад без назначения даёт STATUS_MOVE_FORBIDDEN', async () => {
      const task = await createTask(t, team, { status: 'review' });
      const res = await moveTask(t, team.worker.token, task.key, 'work');
      expect(res.status).toBe(403);
      expect(await errorCode(res)).toBe('STATUS_MOVE_FORBIDDEN');
    });

    it('ревьювер возвращает из review только в work', async () => {
      const task = await createTask(t, team, { status: 'review' });
      expect(
        (await moveTask(t, team.reviewer.token, task.key, 'todo')).status,
      ).toBe(403);
      expect(
        (await moveTask(t, team.reviewer.token, task.key, 'work')).status,
      ).toBe(200);

      const inTest = await createTask(t, team, { status: 'test' });
      for (const to of ['review', 'work', 'todo']) {
        expect(
          (await moveTask(t, team.reviewer.token, inTest.key, to)).status,
          to,
        ).toBe(403);
      }
    });

    it('тестировщик возвращает из test в review или work', async () => {
      const first = await createTask(t, team, { status: 'test' });
      expect(
        (await moveTask(t, team.tester.token, first.key, 'review')).status,
      ).toBe(200);
      const second = await createTask(t, team, { status: 'test' });
      expect(
        (await moveTask(t, team.tester.token, second.key, 'work')).status,
      ).toBe(200);
      const third = await createTask(t, team, { status: 'test' });
      expect(
        (await moveTask(t, team.tester.token, third.key, 'todo')).status,
      ).toBe(403);
      const done = await createTask(t, team, { status: 'done' });
      expect(
        (await moveTask(t, team.tester.token, done.key, 'test')).status,
      ).toBe(403);
    });

    it('автор назад не двигает', async () => {
      const task = await createTask(t, team, {
        status: 'review',
        authorId: team.worker.id,
      });
      expect(
        (await moveTask(t, team.worker.token, task.key, 'work')).status,
      ).toBe(403);
    });

    it('гость, оставшийся ревьювером после понижения, тоже не двигает', async () => {
      const local = await createTeam(t);
      const task = await createTask(t, local, { status: 'review' });
      await setRole(t, local.admin, local.boardId, local.reviewer.id, 'guest');
      const res = await moveTask(t, local.reviewer.token, task.key, 'work');
      expect(res.status).toBe(403);
      expect(await errorCode(res)).toBe('ROLE_FORBIDDEN');
    });
  });

  describe('запрет брать в работу', () => {
    it('рабочий получает TASK_TAKE_LOCKED при любом выходе из todo', async () => {
      const task = await createTask(t, team);
      await t.request('PUT', `/tasks/${task.key}/take-lock`, team.admin.token);
      for (const to of ['work', 'review', 'test', 'done']) {
        const res = await moveTask(t, team.worker.token, task.key, to);
        expect(res.status, to).toBe(403);
        expect(await errorCode(res)).toBe('TASK_TAKE_LOCKED');
      }
    });

    it('выход из todo администратором снимает запрет', async () => {
      const task = await createTask(t, team);
      await t.request('PUT', `/tasks/${task.key}/take-lock`, team.admin.token);
      const res = await moveTask(t, team.admin.token, task.key, 'work');
      expect(res.status).toBe(200);
      expect((await json(res)).isTakeLocked).toBe(false);
    });

    it('запрет не в todo даёт TASK_NOT_LOCKABLE', async () => {
      const task = await createTask(t, team, { status: 'work' });
      const res = await t.request(
        'PUT',
        `/tasks/${task.key}/take-lock`,
        team.admin.token,
      );
      expect(res.status).toBe(409);
      expect(await errorCode(res)).toBe('TASK_NOT_LOCKABLE');
    });

    it('повторная установка и снятие возвращают 200', async () => {
      const task = await createTask(t, team);
      const path = `/tasks/${task.key}/take-lock`;
      expect(
        (await json(await t.request('PUT', path, team.admin.token)))
          .isTakeLocked,
      ).toBe(true);
      expect((await t.request('PUT', path, team.admin.token)).status).toBe(200);
      expect(
        (await json(await t.request('DELETE', path, team.admin.token)))
          .isTakeLocked,
      ).toBe(false);
      expect((await t.request('DELETE', path, team.admin.token)).status).toBe(
        200,
      );
    });
  });

  describe('правка задачи рабочим', () => {
    it('status вместе с priority: 403 и ничего не меняется', async () => {
      const task = await createTask(t, team, { priority: 'low' });
      const res = await t.request(
        'PATCH',
        `/tasks/${task.key}`,
        team.worker.token,
        {
          status: 'work',
          priority: 'high',
        },
      );
      expect(res.status).toBe(403);
      expect(await errorCode(res)).toBe('ROLE_FORBIDDEN');
      const detail = await json(
        await t.request('GET', `/tasks/${task.key}`, team.worker.token),
      );
      expect(detail).toMatchObject({ status: 'todo', priority: 'low' });
    });

    it('создание в todo проходит, с status: work даёт 403', async () => {
      const ok = await t.request(
        'POST',
        `/boards/${team.boardId}/tasks`,
        team.worker.token,
        taskBody(team, { status: 'todo' }),
      );
      expect(ok.status).toBe(201);
      const denied = await t.request(
        'POST',
        `/boards/${team.boardId}/tasks`,
        team.worker.token,
        taskBody(team, { status: 'work' }),
      );
      expect(denied.status).toBe(403);
      expect(await errorCode(denied)).toBe('STATUS_MOVE_FORBIDDEN');
    });
  });

  it('администратор двигает задачу куда угодно', async () => {
    const task = await createTask(t, team, { status: 'done' });
    expect((await moveTask(t, team.admin.token, task.key, 'todo')).status).toBe(
      200,
    );
  });

  describe('назначения', () => {
    it('гостя назначить нельзя', async () => {
      const res = await t.request(
        'POST',
        `/boards/${team.boardId}/tasks`,
        team.admin.token,
        taskBody(team, { reviewerId: team.guest.id }),
      );
      expect(res.status).toBe(422);
      const { error } = await json(res);
      expect(error.code).toBe('ASSIGNEE_IS_GUEST');
      expect(error.fields.reviewerId).toBeTruthy();
    });

    it('не участника назначить нельзя', async () => {
      const outsider = await createUser(t);
      const res = await t.request(
        'POST',
        `/boards/${team.boardId}/tasks`,
        team.admin.token,
        taskBody(team, { testerId: outsider.id }),
      );
      expect(res.status).toBe(422);
      const { error } = await json(res);
      expect(error.code).toBe('NOT_BOARD_MEMBER');
      expect(error.fields.testerId).toBeTruthy();
    });

    it('понижённого до гостя можно оставить, назначить заново нельзя', async () => {
      const local = await createTeam(t);
      const task = await createTask(t, local, { authorId: local.worker.id });
      await setRole(t, local.admin, local.boardId, local.worker.id, 'guest');

      const keep = await t.request(
        'PATCH',
        `/tasks/${task.key}`,
        local.admin.token,
        {
          title: 'Новое название',
          authorId: local.worker.id,
        },
      );
      expect(keep.status).toBe(200);

      const other = await createTask(t, local, { authorId: local.tester.id });
      const assign = await t.request(
        'PATCH',
        `/tasks/${other.key}`,
        local.admin.token,
        {
          authorId: local.worker.id,
        },
      );
      expect(assign.status).toBe(422);
      expect(await errorCode(assign)).toBe('ASSIGNEE_IS_GUEST');
    });

    it('убранного с доски можно оставить, назначить заново нельзя', async () => {
      const local = await createTeam(t);
      const task = await createTask(t, local, { authorId: local.worker.id });
      await t.request(
        'DELETE',
        `/boards/${local.boardId}/members/${local.worker.id}`,
        local.admin.token,
      );

      const keep = await t.request(
        'PATCH',
        `/tasks/${task.key}`,
        local.admin.token,
        {
          priority: 'high',
          authorId: local.worker.id,
        },
      );
      expect(keep.status).toBe(200);

      const other = await createTask(t, local, { authorId: local.tester.id });
      const assign = await t.request(
        'PATCH',
        `/tasks/${other.key}`,
        local.admin.token,
        {
          authorId: local.worker.id,
        },
      );
      expect(assign.status).toBe(422);
      expect(await errorCode(assign)).toBe('NOT_BOARD_MEMBER');
    });
  });

  it('myRole приходит в списке досок, детали доски и детали задачи', async () => {
    const task = await createTask(t, team);
    const list = await json(
      await t.request('GET', '/boards', team.guest.token),
    );
    expect(
      list.items.find((b: { id: number }) => b.id === team.boardId).myRole,
    ).toBe('guest');
    expect(
      (
        await json(
          await t.request('GET', `/boards/${team.boardId}`, team.worker.token),
        )
      ).myRole,
    ).toBe('worker');
    expect(
      (
        await json(
          await t.request('GET', `/tasks/${task.key}`, team.admin.token),
        )
      ).myRole,
    ).toBe('admin');
  });

  it('поиск задач не содержит задач с досок, где пользователь гость', async () => {
    const task = await createTask(t, team, { title: 'Уникальноеслово' });
    const q = encodeURIComponent('уникальноеслово');
    const asGuest = await json(
      await t.request('GET', `/tasks/search?q=${q}`, team.guest.token),
    );
    expect(asGuest.items).toEqual([]);
    const asWorker = await json(
      await t.request('GET', `/tasks/search?q=${q}`, team.worker.token),
    );
    expect(asWorker.items.map((i: { key: string }) => i.key)).toEqual([
      task.key,
    ]);
  });
});
