import { Pool, neon } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWebSocket } from 'drizzle-orm/neon-serverless';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

import * as schema from './schema.js';

/** `transaction` убран из типа: HTTP-драйвер его не поддерживает, транзакции идут через `withTx`. */
export type Db = Omit<
  PgDatabase<PgQueryResultHKT, typeof schema>,
  'transaction'
>;

export type WithTx = <T>(fn: (tx: Db) => Promise<T>) => Promise<T>;

export function createDatabase(connectionString: string): {
  db: Db;
  withTx: WithTx;
} {
  const db = drizzleHttp({ client: neon(connectionString), schema });

  const withTx: WithTx = async (fn) => {
    const pool = new Pool({ connectionString });
    try {
      return await drizzleWebSocket({ client: pool, schema }).transaction(
        (tx) => fn(tx),
      );
    } finally {
      await pool.end();
    }
  };

  return { db, withTx };
}
