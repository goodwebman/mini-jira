import {
  notificationsResponseSchema,
  taskCommentSchema,
} from '@gwmt/contracts';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { notifications, taskComments } from '../src/db/schema.js';
import { createTask, createTeam, setRole } from './fixtures.js';
import { type TestApp, createTestApp, createUser, json } from './helpers.js';

describe('task notification events', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  const list = async (token: string) =>
    notificationsResponseSchema.parse(
      await json(await t.request('GET', '/notifications?pageSize=100', token)),
    );
  const clear = () => t.db.delete(notifications);

  it('notifies assigned people once even with several roles and excludes the actor', async () => {
    const team = await createTeam(t);
    await clear();
    const task = await createTask(t, team, {
      reviewerId: team.worker.id,
      testerId: team.worker.id,
      designerId: team.admin.id,
    });
    const result = await list(team.worker.token);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      type: 'task_assigned',
      taskKey: task.key,
    });
    expect(result.items[0]!.message).toContain('автор, ревьювер, тестировщик');
    expect((await list(team.admin.token)).total).toBe(0);
    expect((await list(team.guest.token)).total).toBe(0);
  });

  it('notifies about handoffs, review rejection, failed tests, completion and reopening', async () => {
    const team = await createTeam(t);
    const task = await createTask(t, team);
    await clear();
    const move = async (
      status: string,
      token: string,
      expectedType: string,
    ) => {
      expect(
        (await t.request('PATCH', `/tasks/${task.key}`, token, { status }))
          .status,
      ).toBe(200);
      const owner = await list(team.worker.token);
      expect(owner.items).toHaveLength(1);
      expect(owner.items[0]).toMatchObject({
        type: expectedType,
        taskKey: task.key,
      });
      await clear();
    };
    await move('review', team.admin.token, 'task_status_changed');
    await move('work', team.reviewer.token, 'task_review_rejected');
    await move('test', team.admin.token, 'task_status_changed');
    await move('review', team.tester.token, 'task_test_failed');
    await move('test', team.admin.token, 'task_status_changed');
    await move('work', team.tester.token, 'task_test_failed');
    await move('done', team.admin.token, 'task_status_changed');
    await move('work', team.admin.token, 'task_status_changed');
    expect(
      (
        await t.request('PATCH', `/tasks/${task.key}`, team.guest.token, {
          status: 'done',
        })
      ).status,
    ).toBe(403);
    expect((await list(team.worker.token)).total).toBe(0);
  });

  it('notifies old and new assignees and avoids notifications on no-op updates', async () => {
    const team = await createTeam(t);
    const task = await createTask(t, team);
    await clear();
    expect(
      (
        await t.request('PATCH', `/tasks/${task.key}`, team.admin.token, {
          title: task.title,
          status: task.status,
          authorId: team.worker.id,
        })
      ).status,
    ).toBe(200);
    expect((await list(team.worker.token)).total).toBe(0);
    expect(
      (
        await t.request('PATCH', `/tasks/${task.key}`, team.admin.token, {
          authorId: team.tester.id,
          title: 'Новое название',
        })
      ).status,
    ).toBe(200);
    expect((await list(team.worker.token)).items[0]!.type).toBe(
      'task_unassigned',
    );
    expect((await list(team.tester.token)).items).toHaveLength(1);
    expect((await list(team.tester.token)).items[0]!.type).toBe(
      'task_assigned',
    );
    expect((await list(team.reviewer.token)).items[0]!.type).toBe(
      'task_updated',
    );
  });

  it('notifies participants, replies and mentions with one notification per user and a comment target', async () => {
    const team = await createTeam(t);
    const task = await createTask(t, team);
    const root = taskCommentSchema.parse(
      await json(
        await t.request(
          'POST',
          `/tasks/${task.key}/comments`,
          team.worker.token,
          { text: 'Вопрос' },
        ),
      ),
    );
    await clear();
    const reviewer = await t.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, team.reviewer.id),
    });
    const text = `@${reviewer!.name} посмотри`;
    const res = await t.request(
      'POST',
      `/tasks/${task.key}/comments`,
      team.admin.token,
      {
        text,
        parentId: root.id,
        mentions: [
          {
            userId: team.reviewer.id,
            start: 0,
            end: reviewer!.name.length + 1,
          },
        ],
      },
    );
    expect(res.status).toBe(201);
    const comment = taskCommentSchema.parse(await json(res));
    expect(comment.mentions).toHaveLength(1);
    for (const [user, type] of [
      [team.worker, 'comment_reply'],
      [team.reviewer, 'comment_mention'],
      [team.tester, 'comment_added'],
    ] as const) {
      const result = await list(user.token);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        type,
        taskKey: task.key,
        commentId: comment.id,
      });
    }
    expect((await list(team.admin.token)).total).toBe(0);
    expect((await list(team.guest.token)).total).toBe(0);
  });

  it('allows mentions of guests and duplicate names using user IDs, but not outside or removed members', async () => {
    const team = await createTeam(t);
    const task = await createTask(t, team);
    const outsider = await createUser(t, { name: 'Одинаковое имя' });
    await t.db.execute(
      sql`update users set name = 'Одинаковое имя' where id in (${team.guest.id}, ${team.worker.id})`,
    );
    await clear();
    const mention = (userId: string) =>
      t.request('POST', `/tasks/${task.key}/comments`, team.admin.token, {
        text: '@Одинаковое имя',
        mentions: [{ userId, start: 0, end: 15 }],
      });
    expect((await mention(team.guest.id)).status).toBe(201);
    expect((await list(team.guest.token)).items[0]!.type).toBe(
      'comment_mention',
    );
    expect((await mention(outsider.id)).status).toBe(422);
    await t.request(
      'DELETE',
      `/boards/${team.boardId}/members/${team.guest.id}`,
      team.admin.token,
    );
    expect((await mention(team.guest.id)).status).toBe(422);
  });

  it('rejects forged names, overlapping ranges and out-of-bounds mentions without writing comments', async () => {
    const team = await createTeam(t);
    const task = await createTask(t, team);
    await clear();
    for (const mentions of [
      [{ userId: team.worker.id, start: 0, end: 5 }],
      [{ userId: team.worker.id, start: 0, end: 100 }],
      [{ userId: team.worker.id, start: 2, end: 1 }],
      [
        { userId: team.worker.id, start: 0, end: 5 },
        { userId: team.reviewer.id, start: 0, end: 5 },
      ],
    ]) {
      expect(
        (
          await t.request(
            'POST',
            `/tasks/${task.key}/comments`,
            team.admin.token,
            { text: '@fake', mentions },
          )
        ).status,
      ).toBe(422);
    }
    expect(
      await t.db
        .select()
        .from(taskComments)
        .where(eq(taskComments.taskId, task.id)),
    ).toEqual([]);
    expect((await list(team.worker.token)).total).toBe(0);
  });

  it('does not notify yourself and does not duplicate a mention for several occurrences', async () => {
    const team = await createTeam(t);
    const task = await createTask(t, team);
    await t.db.execute(
      sql`update users set name = 'Участник' where id = ${team.worker.id}`,
    );
    await clear();
    const text = '@Участник @Участник';
    const mentions = [
      { userId: team.worker.id, start: 0, end: 9 },
      { userId: team.worker.id, start: 10, end: 19 },
    ];
    expect(
      (
        await t.request(
          'POST',
          `/tasks/${task.key}/comments`,
          team.admin.token,
          { text, mentions },
        )
      ).status,
    ).toBe(201);
    expect((await list(team.worker.token)).items).toHaveLength(1);
    await clear();
    expect(
      (
        await t.request(
          'POST',
          `/tasks/${task.key}/comments`,
          team.worker.token,
          { text, mentions },
        )
      ).status,
    ).toBe(201);
    expect((await list(team.worker.token)).total).toBe(0);
  });

  it('notifies about role changes and removal, then stops task notifications to removed users', async () => {
    const team = await createTeam(t);
    const task = await createTask(t, team);
    await clear();
    await setRole(t, team.admin, team.boardId, team.worker.id, 'guest');
    await setRole(t, team.admin, team.boardId, team.worker.id, 'guest');
    expect(
      (await list(team.worker.token)).items.map((item) => item.type),
    ).toEqual(['board_role_changed']);
    await t.request(
      'DELETE',
      `/boards/${team.boardId}/members/${team.worker.id}`,
      team.admin.token,
    );
    await clear();
    await t.request('PATCH', `/tasks/${task.key}`, team.admin.token, {
      title: 'Изменение после удаления',
    });
    expect((await list(team.worker.token)).total).toBe(0);
  });

  it('creates activity notifications once for pause, resume, lock and links', async () => {
    const team = await createTeam(t);
    const task = await createTask(t, team);
    await clear();
    const action = async (method: string, suffix: string, count: number) => {
      expect(
        (
          await t.request(
            method,
            `/tasks/${task.key}/${suffix}`,
            team.admin.token,
          )
        ).status,
      ).toBe(200);
      expect((await list(team.worker.token)).total).toBe(count);
    };
    await action('PUT', 'take-lock', 1);
    await action('PUT', 'take-lock', 1);
    await action('DELETE', 'take-lock', 2);
    await action('DELETE', 'take-lock', 2);
    await t.request('PATCH', `/tasks/${task.key}`, team.admin.token, {
      status: 'work',
    });
    await clear();
    await action('POST', 'pause', 1);
    await action('POST', 'pause', 1);
    await action('POST', 'resume', 2);
    await action('POST', 'resume', 2);
    const other = await createTask(t, team);
    await clear();
    expect(
      (
        await t.request('POST', `/tasks/${task.key}/links`, team.admin.token, {
          type: 'rel',
          targetKey: other.key,
        })
      ).status,
    ).toBe(201);
    expect((await list(team.worker.token)).total).toBe(2);
    await t.request(
      'DELETE',
      `/tasks/${task.key}/links/${other.key}`,
      team.admin.token,
    );
    expect((await list(team.worker.token)).total).toBe(4);
    await t.request(
      'DELETE',
      `/tasks/${task.key}/links/${other.key}`,
      team.admin.token,
    );
    expect((await list(team.worker.token)).total).toBe(4);
  });

  it('rolls back comments and task changes when notifications fail', async () => {
    const team = await createTeam(t);
    const task = await createTask(t, team);
    await clear();
    await t.db.execute(
      sql`alter table notifications add constraint reject_task_notifications check (task_key is null)`,
    );
    try {
      expect(
        (
          await t.request(
            'POST',
            `/tasks/${task.key}/comments`,
            team.admin.token,
            { text: 'Откат' },
          )
        ).status,
      ).toBe(500);
      expect(
        await t.db
          .select()
          .from(taskComments)
          .where(eq(taskComments.taskId, task.id)),
      ).toEqual([]);
      expect(
        (
          await t.request('PATCH', `/tasks/${task.key}`, team.admin.token, {
            title: 'Откат',
          })
        ).status,
      ).toBe(500);
      const detail = await json(
        await t.request('GET', `/tasks/${task.key}`, team.admin.token),
      );
      expect(detail.title).toBe(task.title);
    } finally {
      await t.db.execute(
        sql`alter table notifications drop constraint reject_task_notifications`,
      );
    }
  });
});
