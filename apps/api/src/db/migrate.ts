import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString)
  throw new Error('Не задана переменная DATABASE_URL_UNPOOLED');

const pool = new Pool({ connectionString });
try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  console.log('Миграции применены');
} finally {
  await pool.end();
}
