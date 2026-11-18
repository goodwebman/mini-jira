import type { BoardTaskEvent } from '@gwmt/contracts';
import { Client } from '@neondatabase/serverless';

import type { AppDeps } from '../../lib/context.js';
import { listMembersOfBoards } from '../boards/repo.js';
import { TASK_EVENTS_CHANNEL, findAffectedCards } from './repo.js';
import { toTaskCard } from './service.js';

type Listener = {
  boardId: number;
  userId: string;
  send: (event: BoardTaskEvent) => void;
  close: () => void;
};

export interface TaskEventSource {
  subscribe: (listener: Listener) => Promise<() => void>;
}

/** Один LISTEN на экземпляр API, общий для всех открытых SSE-подписок. */
export function createTaskEventSource(deps: AppDeps): TaskEventSource {
  const listeners = new Set<Listener>();
  let connection: Client | undefined;
  let connecting: Promise<void> | undefined;
  let delivery = Promise.resolve();

  const disconnect = () => {
    const current = connection;
    connection = undefined;
    connecting = undefined;
    for (const listener of listeners) listener.close();
    listeners.clear();
    if (current) void current.end().catch(() => {});
  };

  const deliver = async (taskId: string) => {
    if (listeners.size === 0) return;
    const refreshBoardId = taskId.startsWith('board:')
      ? Number(taskId.slice('board:'.length))
      : undefined;
    const cards =
      refreshBoardId === undefined
        ? (await findAffectedCards(deps.db, taskId)).map(toTaskCard)
        : [];
    const boardIds =
      refreshBoardId === undefined
        ? [...new Set(cards.map((card) => card.boardId))]
        : [refreshBoardId];
    const members = await listMembersOfBoards(deps.db, boardIds);
    for (const listener of listeners) {
      const items = cards.filter((card) => card.boardId === listener.boardId);
      if (items.length === 0 && listener.boardId !== refreshBoardId) continue;
      // Доступ проверяется заново перед отправкой данных, а не только при подключении.
      if (
        !members.some(
          (member) =>
            member.boardId === listener.boardId &&
            member.id === listener.userId,
        )
      ) {
        listener.close();
        continue;
      }
      listener.send(
        refreshBoardId === undefined
          ? {
              type: 'tasks.changed',
              items,
              serverTime: deps.now().toISOString(),
            }
          : { type: 'ready' },
      );
    }
  };

  const connect = () => {
    if (connecting) return connecting;
    const client = new Client({
      connectionString: deps.env.DATABASE_URL_UNPOOLED,
      connectionTimeoutMillis: 10_000,
    });
    connection = client;
    const failed = () => {
      if (connection === client) disconnect();
    };
    client.on('error', failed);
    client.on('end', failed);
    client.on('notification', (message) => {
      if (message.channel !== TASK_EVENTS_CHANNEL || !message.payload) return;
      const taskId = message.payload;
      delivery = delivery.then(() => deliver(taskId)).catch(failed);
    });
    connecting = (async () => {
      try {
        await client.connect();
        await client.query(`LISTEN ${TASK_EVENTS_CHANNEL}`);
      } catch (error) {
        failed();
        throw error;
      }
    })();
    return connecting;
  };

  return {
    async subscribe(listener) {
      listeners.add(listener);
      try {
        await connect();
      } catch (error) {
        listeners.delete(listener);
        throw error;
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) disconnect();
      };
    },
  };
}
