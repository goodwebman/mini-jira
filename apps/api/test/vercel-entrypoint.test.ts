import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

// Правила из @vercel/hono: перебор идёт в этом порядке, берётся первый файл с импортом голого hono.
const CANDIDATES = [
  'app',
  'index',
  'server',
  'src/app',
  'src/index',
  'src/server',
];
const EXTENSIONS = ['js', 'cjs', 'mjs', 'ts', 'cts', 'mts'];
const IMPORTS_HONO =
  /(?:from|require|import)\s*(?:\(\s*)?["']hono["']\s*(?:\))?/;

describe('сборка на Vercel', () => {
  it('инициализирует мониторинг до модулей приложения и читает локальный .env до создания клиента', () => {
    const entry = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
    expect(entry.match(/^import\s+[^;]+;/m)?.[0]).toBe(
      "import './instrument.js';",
    );
    const dev = readFileSync(resolve(root, 'src/dev.ts'), 'utf8');
    expect(dev.indexOf("process.loadEnvFile('.env')")).toBeLessThan(
      dev.indexOf("await import('./instrument.js')"),
    );
    expect(dev).not.toMatch(/import\s+\{\s*createApp\s*\}\s+from/);
  });

  it('билдер выбирает src/index.ts, а не фабрику из src/app.ts', () => {
    const detected = CANDIDATES.flatMap((name) =>
      EXTENSIONS.map((ext) => `${name}.${ext}`),
    ).find((file) => {
      const path = resolve(root, file);
      return existsSync(path) && IMPORTS_HONO.test(readFileSync(path, 'utf8'));
    });
    expect(detected).toBe('src/index.ts');
  });

  it('module задан в самом tsconfig.json приложения', () => {
    // @vercel/node читает tsconfig без учёта extends. Если module здесь нет, он ставит strict: false,
    // типы zod и Hono вырождаются в never, и билд падает, хотя локальный tsc проходит.
    const tsconfig = JSON.parse(
      readFileSync(resolve(root, 'tsconfig.json'), 'utf8'),
    );
    expect(tsconfig.compilerOptions.module).toBeDefined();
  });
});
