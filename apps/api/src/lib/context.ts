import type { BoardRole } from '@gwmt/contracts';
import type { Env as HonoEnv } from 'hono';
import type { Db, WithTx } from '../db/client.js';
import type { Env } from './env.js';

export interface AppDeps {
  db: Db;
  withTx: WithTx;
  env: Env;
  now: () => Date;
}

export interface TaskAccess {
  id: string;
  key: string;
  boardId: number;
}

export interface AppEnv extends HonoEnv {
  Variables: {
    requestId: string;
    userId: string;
    sessionId: string;
    boardId: number;
    boardRole: BoardRole;
    task: TaskAccess;
  };
}
