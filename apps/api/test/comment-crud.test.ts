import { taskCommentSchema, taskDetailSchema } from '@gwmt/contracts';
import { eq } from 'drizzle-orm';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { notifications } from '../src/db/schema.js';
import * as repo from '../src/modules/comments/repo.js';
import { type Team, createTask, createTeam, errorCode } from './fixtures.js';
import { type TestApp, createTestApp, createUser, json } from './helpers.js';

describe('CRUD комментариев', () => {
  let t: TestApp;
  let team: Team;
  beforeAll(async () => {
    t = await createTestApp();
    team = await createTeam(t);
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(() => t.close());

  const create = async (
    key: string,
    token = team.worker.token,
    parentId?: string,
  ) => {
    t.advance(1000);
    const response = await t.request('POST', `/tasks/${key}/comments`, token, {
      text: 'Комментарий',
      parentId,
    });
    expect(response.status).toBe(201);
    return taskCommentSchema.parse(await json(response));
  };
  const detail = async (key: string) =>
    taskDetailSchema.parse(
      await json(await t.request('GET', `/tasks/${key}`, team.admin.token)),
    );
  const path = (key: string, id: string) => `/tasks/${key}/comments/${id}`;

  it.each(['worker', 'admin'] as const)(
    'автор %s редактирует свой комментарий, сохраняя автора, время и родителя',
    async (role) => {
      const task = await createTask(t, team);
      const parent = await create(task.key);
      const comment = await create(task.key, team[role].token, parent.id);
      const res = await t.request(
        'PATCH',
        path(task.key, comment.id),
        team[role].token,
        { text: '  Новый текст  ' },
      );
      expect(res.status).toBe(200);
      const updated = taskCommentSchema.parse(await json(res));
      expect(updated).toEqual({ ...comment, text: 'Новый текст' });
      expect((await detail(task.key)).comments).toContainEqual(updated);
    },
  );

  it.each(['worker', 'admin'] as const)(
    '%s не может редактировать чужой комментарий',
    async (role) => {
      const task = await createTask(t, team);
      const comment = await create(task.key, team.reviewer.token);
      const res = await t.request(
        'PATCH',
        path(task.key, comment.id),
        team[role].token,
        { text: 'Подмена' },
      );
      expect(res.status).toBe(403);
      expect(await errorCode(res)).toBe('ROLE_FORBIDDEN');
      expect((await detail(task.key)).comments).toEqual([comment]);
    },
  );

  it('рабочий не удаляет чужой комментарий, администратор удаляет любой', async () => {
    const task = await createTask(t, team);
    const comment = await create(task.key, team.reviewer.token);
    expect(
      (await t.request('DELETE', path(task.key, comment.id), team.worker.token))
        .status,
    ).toBe(403);
    expect(
      (await t.request('DELETE', path(task.key, comment.id), team.admin.token))
        .status,
    ).toBe(204);
    expect((await detail(task.key)).comments).toEqual([]);
  });

  it('удаляет только свой комментарий, сохраняет чужие ответы и удаляет его уведомления', async () => {
    const task = await createTask(t, team);
    const root = await create(task.key);
    const reply = await create(task.key, team.reviewer.token, root.id);
    const nested = await create(task.key, team.tester.token, reply.id);
    expect(
      (
        await t.db
          .select()
          .from(notifications)
          .where(eq(notifications.commentId, root.id))
      ).length,
    ).toBeGreaterThan(0);
    const res = await t.request(
      'DELETE',
      path(task.key, root.id),
      team.worker.token,
    );
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect((await detail(task.key)).comments).toEqual([
      { ...reply, parentId: null },
      nested,
    ]);
    expect(
      await t.db
        .select()
        .from(notifications)
        .where(eq(notifications.commentId, root.id)),
    ).toEqual([]);
    expect(
      (await t.request('DELETE', path(task.key, root.id), team.worker.token))
        .status,
    ).toBe(404);
  });

  it('при удалении вложенного комментария переподвешивает ответы к его родителю', async () => {
    const task = await createTask(t, team);
    const root = await create(task.key);
    const reply = await create(task.key, team.reviewer.token, root.id);
    const nested = await create(task.key, team.tester.token, reply.id);
    expect(
      (await t.request('DELETE', path(task.key, reply.id), team.reviewer.token))
        .status,
    ).toBe(204);
    expect((await detail(task.key)).comments).toEqual([
      root,
      { ...nested, parentId: root.id },
    ]);
  });

  it('проверяет текст и упоминания, очищает прежние упоминания при редактировании', async () => {
    const task = await createTask(t, team);
    const comment = await create(task.key);
    const url = path(task.key, comment.id);
    const reviewer = (await detail(task.key)).assigneeOptions.find(
      (member) => member.id === team.reviewer.id,
    )!;
    const text = `@${reviewer.name}`;
    const mention = { userId: reviewer.id, start: 0, end: text.length };
    expect(
      (
        await t.request('PATCH', url, team.worker.token, {
          text,
          mentions: [mention],
        })
      ).status,
    ).toBe(200);
    expect((await detail(task.key)).comments[0]?.mentions).toEqual([mention]);
    const outsider = await createUser(t);
    for (const body of [
      { text: ' ' },
      { text: 'a'.repeat(10_001) },
      { text, mentions: [{ ...mention, userId: outsider.id }] },
      { text, mentions: [{ ...mention, end: text.length + 1 }] },
    ])
      expect(
        (await t.request('PATCH', url, team.worker.token, body)).status,
      ).toBe(422);
    expect((await detail(task.key)).comments[0]?.text).toBe(text);
    expect(
      (
        await t.request('PATCH', url, team.worker.token, {
          text: 'Без упоминаний',
        })
      ).status,
    ).toBe(200);
    expect((await detail(task.key)).comments[0]?.mentions).toBeUndefined();
  });

  it('уведомляет только о новом упоминании и не повторяет его при правке текста', async () => {
    const task = await createTask(t, team);
    const comment = await create(task.key);
    const reviewer = (await detail(task.key)).assigneeOptions.find(
      (member) => member.id === team.reviewer.id,
    )!;
    const text = `@${reviewer.name}`;
    const mentions = [{ userId: reviewer.id, start: 0, end: text.length }];
    for (const suffix of ['', ' исправление']) {
      expect(
        (
          await t.request(
            'PATCH',
            path(task.key, comment.id),
            team.worker.token,
            { text: text + suffix, mentions },
          )
        ).status,
      ).toBe(200);
    }
    const notices = await t.db
      .select()
      .from(notifications)
      .where(eq(notifications.commentId, comment.id));
    expect(
      notices.filter((notice) => notice.type === 'comment_mention'),
    ).toMatchObject([{ userId: team.reviewer.id }]);
  });

  it('сохраняет прежние упоминания после переименования и выхода участника', async () => {
    const local = await createTeam(t);
    const task = await createTask(t, local);
    const taskDetail = taskDetailSchema.parse(
      await json(
        await t.request('GET', `/tasks/${task.key}`, local.admin.token),
      ),
    );
    const reviewer = taskDetail.assigneeOptions.find(
      (member) => member.id === local.reviewer.id,
    )!;
    const text = `@${reviewer.name}`;
    const mentions = [{ userId: reviewer.id, start: 0, end: text.length }];
    const res = await t.request(
      'POST',
      `/tasks/${task.key}/comments`,
      local.worker.token,
      { text, mentions },
    );
    expect(res.status).toBe(201);
    const comment = taskCommentSchema.parse(await json(res));
    expect(
      (
        await t.request('PATCH', '/me', local.reviewer.token, {
          name: 'Новое имя',
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await t.request(
          'PATCH',
          path(task.key, comment.id),
          local.worker.token,
          { text: `${text} после переименования`, mentions },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await t.request(
          'DELETE',
          `/boards/${local.boardId}/members/${local.reviewer.id}`,
          local.admin.token,
        )
      ).status,
    ).toBe(204);
    expect(
      (
        await t.request(
          'PATCH',
          path(task.key, comment.id),
          local.worker.token,
          { text: `${text} после выхода`, mentions },
        )
      ).status,
    ).toBe(200);
  });

  it.each(['PATCH', 'DELETE'])(
    '%s проверяет авторизацию, доступ к задаче и принадлежность комментария',
    async (method) => {
      const task = await createTask(t, team);
      const other = await createTask(t, team);
      const comment = await create(task.key);
      const url = path(task.key, comment.id);
      const body = method === 'PATCH' ? { text: 'Новый' } : undefined;
      const outsider = await createUser(t);
      expect((await t.request(method, url, undefined, body)).status).toBe(401);
      expect(
        (await t.request(method, url, team.guest.token, body)).status,
      ).toBe(403);
      expect((await t.request(method, url, outsider.token, body)).status).toBe(
        404,
      );
      for (const missing of [
        path(other.key, comment.id),
        path(task.key, crypto.randomUUID()),
      ]) {
        const res = await t.request(method, missing, team.admin.token, body);
        expect(res.status).toBe(404);
        expect(await errorCode(res)).toBe('COMMENT_NOT_FOUND');
      }
      expect(
        (
          await t.request(
            method,
            path(task.key, 'invalid'),
            team.admin.token,
            body,
          )
        ).status,
      ).toBe(400);
    },
  );

  it('откатывает удаление и перенос ответов при ошибке транзакции', async () => {
    const task = await createTask(t, team);
    const root = await create(task.key);
    const reply = await create(task.key, team.reviewer.token, root.id);
    const original = repo.deleteComment;
    vi.spyOn(repo, 'deleteComment').mockImplementationOnce(async (...args) => {
      await original(...args);
      throw new Error('rollback');
    });
    expect(
      (await t.request('DELETE', path(task.key, root.id), team.worker.token))
        .status,
    ).toBe(500);
    expect((await detail(task.key)).comments).toEqual([root, reply]);
  });
});
