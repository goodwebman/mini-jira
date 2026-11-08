import { existsSync } from 'node:fs';
import { createSalt, createSaltToken } from './lib/salt.js';

// Заголовки для ручной проверки входа в Swagger и curl: npm run salt -- anna@example.com
if (existsSync('.env')) process.loadEnvFile('.env');

const secret = process.env.SALT_SECRET;
if (!secret) throw new Error('Не задана переменная SALT_SECRET');

const email = process.argv[2] ?? '';
const version = process.argv[3] ?? '1.0.0';
const timestamp = String(Date.now());

console.log(`fastify-version: ${version}`);
console.log(`fastify-timestamp: ${timestamp}`);
console.log(`fastify-token: ${createSaltToken(createSalt(version, secret), email, timestamp)}`);
