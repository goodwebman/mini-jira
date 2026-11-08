import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import type { Db, WithTx } from './db/client.js';
import { loadEnv } from './lib/env.js';

// Документация не обращается к базе, поэтому ей не нужны ни Neon, ни .env.
const PORT = 3001;
const OUTPUT = resolve(import.meta.dirname, '../../../docs/openapi.json');

const app = createApp({
  db: {} as Db,
  withTx: (() => Promise.reject(new Error('База не подключена'))) as WithTx,
  env: loadEnv({
    DATABASE_URL: 'postgresql://docs:docs@localhost/docs',
    DATABASE_URL_UNPOOLED: 'postgresql://docs:docs@localhost/docs',
    JWT_ACCESS_SECRET: 'docs-only-secret-docs-only-secret-docs',
    SALT_SECRET: 'docs-only-secret-docs-only-secret-docs',
    APP_URL: `http://localhost:${PORT}`,
    GITHUB_CLIENT_ID: 'docs',
    GITHUB_CLIENT_SECRET: 'docs',
    GOOGLE_CLIENT_ID: 'docs',
    GOOGLE_CLIENT_SECRET: 'docs',
    NODE_ENV: 'development',
  }),
  now: () => new Date(),
});

if (process.argv.includes('--export')) {
  const document = await (await app.request('/api/v1/openapi.json')).json();
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`Записано: ${OUTPUT}`);
} else {
  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`Swagger: http://localhost:${info.port}/api/v1/docs`);
  });
}
