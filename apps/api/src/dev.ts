import { serve } from '@hono/node-server';
import { existsSync } from 'node:fs';

import { createApp } from './app.js';
import { createDatabase } from './db/client.js';
import { loadEnv } from './lib/env.js';

if (existsSync('.env')) process.loadEnvFile('.env');
const env = loadEnv();

const app = createApp({
  ...createDatabase(env.DATABASE_URL),
  env,
  now: () => new Date(),
});

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`API: http://localhost:${info.port}/api/v1`);
});
