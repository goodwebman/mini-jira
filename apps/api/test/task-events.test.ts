import { type BoardTaskEvent, boardTaskEventSchema } from '@gwmt/contracts';
import { Client } from '@neondatabase/serverless';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { createApp } from '../src/app.js';
import * as repo from '../src/modules/tasks/repo.js';
import { type Team, createTask, createTeam, moveTask } from './fixtures.js';
import { type TestApp, createTestApp, createUser } from './helpers.js';

describe('board task SSE', () => {
  let t: TestApp;
  let team: Team;
  const connections: Client[] = [];
  const readers: ReadableStreamDefaultReader<Uint8Array>[] = [];
  const signals: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
    team = await createTeam(t);
    await t.db.$client.listen(repo.TASK_EVENTS_CHANNEL, (payload) => {
      signals.push(payload);
      for (const connection of connections)
        connection.emit('notification', {
          channel: repo.TASK_EVENTS_CHANNEL,
          payload,
        });
    });
  });
  beforeEach(() => {
    connections.length = 0;
    signals.length = 0;
    vi.spyOn(Client.prototype, 'connect').mockImplementation(function (
      this: Client,
    ) {
      connections.push(this);
    });
    vi.spyOn(Client.prototype, 'query').mockReturnValue(undefined);
    // У драйвера перегрузка с callback возвращает void, без callback — Promise.
    vi.spyOn(Client.prototype, 'end').mockReturnValue(
      Promise.resolve() as never,
    );
  });
  afterEach(async () => {
    for (const reader of readers.splice(0)) await reader.cancel();
    vi.restoreAllMocks();
  });
  afterAll(() => t.close());

  const read = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ): Promise<BoardTaskEvent> => {
    const chunk = await reader.read();
    expect(chunk.done).toBe(false);
    const text = new TextDecoder().decode(chunk.value);
    return boardTaskEventSchema.parse(
      JSON.parse(text.replace(/^data: /, '').trim()),
    );
  };
  const subscribe = async (
    token = team.worker.token,
    boardId = team.boardId,
  ) => {
    const response = await t.request(
      'GET',
      `/boards/${boardId}/tasks/events`,
      token,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Accel-Buffering')).toBe('no');
    const reader = response.body!.getReader();
    readers.push(reader);
    expect(await read(reader)).toEqual({ type: 'ready' });
    return reader;
  };

  it('требует авторизацию и членство в доске', async () => {
    const path = `/boards/${team.boardId}/tasks/events`;
    expect((await t.request('GET', path)).status).toBe(401);
    const outsider = await createUser(t);
    expect((await t.request('GET', path, outsider.token)).status).toBe(404);
    expect(Client.prototype.connect).not.toHaveBeenCalled();
  });

  it('рассылает перенос всем зрителям через одно соединение с БД и одну загрузку карточек', async () => {
    const task = await createTask(t, team);
    const a = await subscribe();
    const b = await subscribe(team.guest.token);
    expect(connections).toHaveLength(1);
    expect(Client.prototype.query).toHaveBeenCalledWith(
      `LISTEN ${repo.TASK_EVENTS_CHANNEL}`,
    );
    const load = vi.spyOn(repo, 'findAffectedCards');
    expect(
      (await moveTask(t, team.worker.token, task.key, 'work')).status,
    ).toBe(200);
    const [eventA, eventB] = await Promise.all([read(a), read(b)]);
    expect(eventA).toEqual(eventB);
    expect(eventA).toMatchObject({
      type: 'tasks.changed',
      items: [{ key: task.key, status: 'work' }],
    });
    expect(load).toHaveBeenCalledTimes(1);
    await a.cancel();
    expect(Client.prototype.end).not.toHaveBeenCalled();
    await b.cancel();
    await vi.waitFor(() => expect(Client.prototype.end).toHaveBeenCalledOnce());
  });

  it('не публикует событие при откате транзакции', async () => {
    const task = await createTask(t, team);
    signals.length = 0;
    await expect(
      t.deps.withTx(async (tx) => {
        await repo.notifyTaskUpdated(tx, task.id);
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(signals).toEqual([]);
  });

  it('после удаления обновляет снимок доски и карточку с удалённым блокером', async () => {
    const blocker = await createTask(t, team, { status: 'work' });
    const blocked = await createTask(t, team);
    expect(
      (
        await t.request(
          'POST',
          `/tasks/${blocker.key}/links`,
          team.admin.token,
          {
            type: 'blocks',
            targetKey: blocked.key,
          },
        )
      ).status,
    ).toBe(201);
    const reader = await subscribe();
    expect(
      (await t.request('DELETE', `/tasks/${blocker.key}`, team.admin.token))
        .status,
    ).toBe(204);
    expect(await read(reader)).toEqual({ type: 'ready' });
    expect(await read(reader)).toMatchObject({
      type: 'tasks.changed',
      items: [{ key: blocked.key, linkCount: 0, isBlocked: false }],
    });
  });

  it('доставляет события подписчикам разных экземпляров API', async () => {
    const task = await createTask(t, team);
    const a = await subscribe();
    const otherApp = createApp(t.deps);
    const response = await otherApp.request(
      `/api/v1/boards/${team.boardId}/tasks/events`,
      {
        headers: { Authorization: `Bearer ${team.worker.token}` },
      },
    );
    const b = response.body!.getReader();
    readers.push(b);
    expect(await read(b)).toEqual({ type: 'ready' });
    expect(connections).toHaveLength(2);
    await moveTask(t, team.worker.token, task.key, 'work');
    const events = await Promise.all([read(a), read(b)]);
    for (const event of events)
      expect(event).toMatchObject({
        type: 'tasks.changed',
        items: [{ key: task.key, status: 'work' }],
      });
  });

  it('пересчитывает связанные блокеры и не отправляет карточки чужой доски', async () => {
    const other = await createTeam(t);
    const blocker = await createTask(t, team, { status: 'work' });
    const blocked = await createTask(t, team);
    const unrelated = await createTask(t, other);
    expect(
      (
        await t.request(
          'POST',
          `/tasks/${blocker.key}/links`,
          team.admin.token,
          { targetKey: blocked.key, type: 'blocks' },
        )
      ).status,
    ).toBe(201);
    const reader = await subscribe();
    await moveTask(t, other.admin.token, unrelated.key, 'work');
    await moveTask(t, team.admin.token, blocker.key, 'done');
    const event = await read(reader);
    expect(event).toMatchObject({ type: 'tasks.changed' });
    if (event.type !== 'tasks.changed')
      throw new Error('Expected changed cards');
    expect(event.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: blocker.key, status: 'done' }),
        expect.objectContaining({ key: blocked.key, isBlocked: false }),
      ]),
    );
    expect(event.items.every((card) => card.boardId === team.boardId)).toBe(
      true,
    );
  });

  it('не передаёт данные участнику, которого удалили после подключения', async () => {
    const local = await createTeam(t);
    const task = await createTask(t, local);
    const reader = await subscribe(local.guest.token, local.boardId);
    expect(
      (
        await t.request(
          'DELETE',
          `/boards/${local.boardId}/members/${local.guest.id}`,
          local.admin.token,
        )
      ).status,
    ).toBe(204);
    await moveTask(t, local.admin.token, task.key, 'work');
    expect((await reader.read()).done).toBe(true);
  });

  it('закрывает SSE при потере LISTEN и создаёт новое подключение для восстановления', async () => {
    const reader = await subscribe();
    connections[0]!.emit('error', new Error('disconnected'));
    expect((await reader.read()).done).toBe(true);
    await subscribe();
    expect(connections).toHaveLength(2);
  });
});
