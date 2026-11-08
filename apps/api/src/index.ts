// Импорт из голого hono обязателен: по нему Vercel находит точку входа. См. src/app.ts.
import type { Hono } from 'hono';
import { createApp } from './app.js';
import { createDatabase } from './db/client.js';
import type { AppEnv } from './lib/context.js';
import { loadEnv } from './lib/env.js';

const env = loadEnv();

const app: Hono<AppEnv, never, '/api/v1'> = createApp({
  ...createDatabase(env.DATABASE_URL),
  env,
  now: () => new Date(),
});

export default app;
