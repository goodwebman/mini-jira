import {
  boardDetailSchema,
  boardListResponseSchema,
  boardMemberSchema,
} from '@gwmt/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  type TestApp,
  type TestUser,
  createTestApp,
  createUser,
  json,
} from './helpers.js';

describe('доски', () => {
  let t: TestApp;
  let keyCounter = 0;
  const nextKey = () => `B${(keyCounter += 1)}`;

  const createBoard = async (
    owner: TestUser,
    members: TestUser[] = [],
    name = 'Доска',
  ) => {
    const res = await t.request('POST', '/boards', owner.token, {
      name,
      key: nextKey(),
      memberIds: members.map((member) => member.id),
    });
    expect(res.status).toBe(201);
    return boardDetailSchema.parse(await json(res));
  };

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(() => t.close());

  describe('создание', () => {
    it('создатель получает admin, остальные worker', async () => {
      const owner = await createUser(t, { timezone: 'Asia/Novosibirsk' });
      const worker = await createUser(t);
      const board = await createBoard(owner, [worker]);

      expect(board.myRole).toBe('admin');
      expect(board.timezone).toBe('Asia/Novosibirsk');
      expect(board.members.find((m) => m.id === owner.id)?.role).toBe('admin');
      expect(board.members.find((m) => m.id === worker.id)?.role).toBe(
        'worker',
      );
      expect(board.colorIndex).toBe(board.id % 6);
    });

    it('сразу создаётся спринт 1 с понедельника недели создания', async () => {
      const owner = await createUser(t);
      const board = await createBoard(owner);
      expect(board.currentSprint).toMatchObject({
        number: 1,
        state: 'active',
        startDate: '2026-11-09',
        endDate: '2026-11-20',
      });
    });

    it('создатель в memberIds и повторы не дублируются', async () => {
      const owner = await createUser(t);
      const worker = await createUser(t);
      const res = await t.request('POST', '/boards', owner.token, {
        name: 'Повторы',
        key: nextKey(),
        memberIds: [owner.id, worker.id, worker.id],
      });
      expect(res.status).toBe(201);
      expect((await json(res)).members).toHaveLength(2);
    });

    it('занятый ключ даёт 409 с fields.key', async () => {
      const owner = await createUser(t);
      const key = nextKey();
      await t.request('POST', '/boards', owner.token, {
        name: 'А',
        key,
        memberIds: [],
      });
      const res = await t.request('POST', '/boards', owner.token, {
        name: 'Б',
        key,
        memberIds: [],
      });
      expect(res.status).toBe(409);
      const { error } = await json(res);
      expect(error.code).toBe('BOARD_KEY_TAKEN');
      expect(error.fields.key).toBe('Такой ключ уже есть');
    });

    it('невалидные поля дают тексты из контракта', async () => {
      const owner = await createUser(t);
      const res = await t.request('POST', '/boards', owner.token, {
        name: ' ',
        key: 'lower',
        memberIds: [],
      });
      expect(res.status).toBe(422);
      const { error } = await json(res);
      expect(error.fields.name).toBe('Введите название');
      expect(error.fields.key).toBe('Введите ключ');
    });

    it('несуществующий участник даёт USER_NOT_FOUND', async () => {
      const owner = await createUser(t);
      const res = await t.request('POST', '/boards', owner.token, {
        name: 'Х',
        key: nextKey(),
        memberIds: ['3f2b7a52-9f0e-4f0a-8f6a-1c2d3e4f5a6b'],
      });
      expect(res.status).toBe(404);
      expect((await json(res)).error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('список', () => {
    let owner: TestUser;
    let worker: TestUser;

    beforeAll(async () => {
      owner = await createUser(t);
      worker = await createUser(t);
      await createBoard(owner, [worker], 'Яблоко');
      await createBoard(owner, [worker], 'Арбуз');
      await createBoard(worker, [], 'Чужая');
    });

    it('по названию, с myRole и превью', async () => {
      const body = boardListResponseSchema.parse(
        await json(await t.request('GET', '/boards', owner.token)),
      );
      expect(body.items.map((item) => item.name)).toEqual(['Арбуз', 'Яблоко']);
      expect(body.total).toBe(2);
      expect(body.items[0]).toMatchObject({
        myRole: 'admin',
        memberCount: 2,
        isFavorite: false,
        currentSprintNumber: 1,
      });
      expect(body.items[0]?.membersPreview).toHaveLength(2);
    });

    it('превью не больше четырёх', async () => {
      const crowd = await Promise.all(
        Array.from({ length: 5 }, () => createUser(t)),
      );
      const lead = await createUser(t);
      await createBoard(lead, crowd, 'Толпа');
      const body = await json(await t.request('GET', '/boards', lead.token));
      expect(body.items[0].membersPreview).toHaveLength(4);
      expect(body.items[0].memberCount).toBe(6);
    });

    it('q ищет по названию, % не считается шаблоном', async () => {
      const found = await json(
        await t.request('GET', '/boards?q=%D1%8F%D0%B1%D0%BB', owner.token),
      );
      expect(found.items.map((item: { name: string }) => item.name)).toEqual([
        'Яблоко',
      ]);
      const none = await json(
        await t.request('GET', '/boards?q=%25', owner.token),
      );
      expect(none.total).toBe(0);
    });

    it('избранное идемпотентно и фильтруется', async () => {
      const { items } = await json(
        await t.request('GET', '/boards', worker.token),
      );
      const id = items[0].id as number;

      expect(
        (await t.request('PUT', `/boards/${id}/favorite`, worker.token)).status,
      ).toBe(204);
      expect(
        (await t.request('PUT', `/boards/${id}/favorite`, worker.token)).status,
      ).toBe(204);

      const favorites = await json(
        await t.request('GET', '/boards?filter=favorite', worker.token),
      );
      expect(favorites.items.map((item: { id: number }) => item.id)).toEqual([
        id,
      ]);
      expect(favorites.items[0].isFavorite).toBe(true);

      const detail = await json(
        await t.request('GET', `/boards/${id}`, worker.token),
      );
      expect(detail.isFavorite).toBe(true);

      expect(
        (await t.request('DELETE', `/boards/${id}/favorite`, worker.token))
          .status,
      ).toBe(204);
      expect(
        (await t.request('DELETE', `/boards/${id}/favorite`, worker.token))
          .status,
      ).toBe(204);
      expect(
        (
          await json(
            await t.request('GET', '/boards?filter=favorite', worker.token),
          )
        ).total,
      ).toBe(0);
    });
  });

  it('неверный boardId в пути даёт 400', async () => {
    const user = await createUser(t);
    const res = await t.request('GET', '/boards/abc', user.token);
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe('BAD_REQUEST');
  });

  describe('участники', () => {
    let admin: TestUser;
    let worker: TestUser;
    let boardId: number;

    beforeAll(async () => {
      admin = await createUser(t);
      worker = await createUser(t);
      boardId = (await createBoard(admin, [worker])).id;
    });

    it('новый участник по умолчанию worker, повтор даёт 409', async () => {
      const user = await createUser(t);
      const res = await t.request(
        'POST',
        `/boards/${boardId}/members`,
        admin.token,
        { userId: user.id },
      );
      expect(res.status).toBe(201);
      expect(boardMemberSchema.parse(await json(res)).role).toBe('worker');

      const again = await t.request(
        'POST',
        `/boards/${boardId}/members`,
        admin.token,
        { userId: user.id },
      );
      expect(again.status).toBe(409);
      expect((await json(again)).error.code).toBe('ALREADY_MEMBER');
    });

    it('роль можно задать при добавлении', async () => {
      const user = await createUser(t);
      const res = await t.request(
        'POST',
        `/boards/${boardId}/members`,
        admin.token,
        {
          userId: user.id,
          role: 'guest',
        },
      );
      expect((await json(res)).role).toBe('guest');
    });

    it('несуществующий пользователь даёт USER_NOT_FOUND', async () => {
      const unknown = '3f2b7a52-9f0e-4f0a-8f6a-1c2d3e4f5a6b';
      const add = await t.request(
        'POST',
        `/boards/${boardId}/members`,
        admin.token,
        { userId: unknown },
      );
      expect((await json(add)).error.code).toBe('USER_NOT_FOUND');
      const patch = await t.request(
        'PATCH',
        `/boards/${boardId}/members/${unknown}`,
        admin.token,
        {
          role: 'guest',
        },
      );
      expect((await json(patch)).error.code).toBe('USER_NOT_FOUND');
      const remove = await t.request(
        'DELETE',
        `/boards/${boardId}/members/${unknown}`,
        admin.token,
      );
      expect((await json(remove)).error.code).toBe('USER_NOT_FOUND');
    });

    it('администратор не меняет свою роль и не убирает себя', async () => {
      const patch = await t.request(
        'PATCH',
        `/boards/${boardId}/members/${admin.id}`,
        admin.token,
        {
          role: 'worker',
        },
      );
      expect(patch.status).toBe(422);
      expect((await json(patch)).error.code).toBe('CANNOT_CHANGE_OWN_ROLE');

      const remove = await t.request(
        'DELETE',
        `/boards/${boardId}/members/${admin.id}`,
        admin.token,
      );
      expect(remove.status).toBe(422);
      expect((await json(remove)).error.code).toBe('CANNOT_REMOVE_SELF');
    });

    it('смена роли действует сразу на тот же токен', async () => {
      const user = await createUser(t);
      await t.request('POST', `/boards/${boardId}/members`, admin.token, {
        userId: user.id,
        role: 'admin',
      });
      const target = await createUser(t);

      const asAdmin = await t.request(
        'POST',
        `/boards/${boardId}/members`,
        user.token,
        { userId: target.id },
      );
      expect(asAdmin.status).toBe(201);

      await t.request(
        'PATCH',
        `/boards/${boardId}/members/${user.id}`,
        admin.token,
        { role: 'worker' },
      );
      const asWorker = await t.request(
        'DELETE',
        `/boards/${boardId}/members/${target.id}`,
        user.token,
      );
      expect(asWorker.status).toBe(403);
      expect((await json(asWorker)).error.code).toBe('ROLE_FORBIDDEN');
    });

    it('кикнутый теряет доступ', async () => {
      const user = await createUser(t);
      await t.request('POST', `/boards/${boardId}/members`, admin.token, {
        userId: user.id,
      });
      expect(
        (await t.request('GET', `/boards/${boardId}`, user.token)).status,
      ).toBe(200);

      expect(
        (
          await t.request(
            'DELETE',
            `/boards/${boardId}/members/${user.id}`,
            admin.token,
          )
        ).status,
      ).toBe(204);
      const res = await t.request('GET', `/boards/${boardId}`, user.token);
      expect(res.status).toBe(404);
      expect((await json(res)).error.code).toBe('BOARD_NOT_FOUND');
    });

    it('роли в детали доски упорядочены по addedAt', async () => {
      const detail = await json(
        await t.request('GET', `/boards/${boardId}`, admin.token),
      );
      const times = detail.members.map((m: { addedAt: string }) => m.addedAt);
      expect(times).toEqual([...times].sort());
    });
  });

  describe('поиск людей', () => {
    let me: TestUser;
    let colleague: TestUser;
    let boardId: number;

    beforeAll(async () => {
      me = await createUser(t, { name: 'Поисковик Главный' });
      colleague = await createUser(t, {
        name: 'Коллега Искомый',
        email: 'colleague@example.com',
      });
      boardId = (await createBoard(me, [colleague])).id;
    });

    it('по вхождению в имя, без email в ответе и без себя', async () => {
      const res = await t.request(
        'GET',
        `/users/search?q=${encodeURIComponent('искомый')}`,
        me.token,
      );
      const body = await json(res);
      expect(body.items.map((u: { id: string }) => u.id)).toEqual([
        colleague.id,
      ]);
      expect(JSON.stringify(body)).not.toContain('@');
      expect(body.items[0]).not.toHaveProperty('email');

      const self = await json(
        await t.request(
          'GET',
          `/users/search?q=${encodeURIComponent('поисковик')}`,
          me.token,
        ),
      );
      expect(self.items).toEqual([]);
    });

    it('email ищется только точным совпадением', async () => {
      const exact = await json(
        await t.request(
          'GET',
          '/users/search?q=COLLEAGUE@example.com',
          me.token,
        ),
      );
      expect(exact.items.map((u: { id: string }) => u.id)).toEqual([
        colleague.id,
      ]);
      const part = await json(
        await t.request('GET', '/users/search?q=colleague@', me.token),
      );
      expect(part.items).toEqual([]);
    });

    it('один символ в q даёт 422', async () => {
      expect(
        (await t.request('GET', '/users/search?q=a', me.token)).status,
      ).toBe(422);
    });

    it('пустой q отдаёт людей с моих досок', async () => {
      const body = await json(
        await t.request('GET', '/users/search', me.token),
      );
      expect(body.items.map((u: { id: string }) => u.id)).toEqual([
        colleague.id,
      ]);
    });

    it('excludeBoardId убирает участников и требует admin', async () => {
      const outsider = await createUser(t, { name: 'Посторонний Искомый' });
      const res = await t.request(
        'GET',
        `/users/search?q=${encodeURIComponent('искомый')}&excludeBoardId=${boardId}`,
        me.token,
      );
      expect((await json(res)).items.map((u: { id: string }) => u.id)).toEqual([
        outsider.id,
      ]);

      const denied = await t.request(
        'GET',
        `/users/search?excludeBoardId=${boardId}`,
        colleague.token,
      );
      expect(denied.status).toBe(403);
      expect((await json(denied)).error.code).toBe('ROLE_FORBIDDEN');
    });
  });
});
