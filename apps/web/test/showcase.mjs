import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

import { DEMO_NOW, mockBrowserApi } from './browser-fixtures.mjs';

const screens = [
  ['01-boards', '/boards', 'Доски', 'Качество данных', 1600, 780],
  [
    '02-kanban',
    '/boards/1',
    'Платёжная платформа и личный кабинет',
    'Включить быстрые платежи для пилота',
    1600,
    900,
  ],
  [
    '03-task-detail',
    '/boards/1/tasks/PAY-101',
    'PAY-101',
    'Комментарии · 2',
    1600,
    1290,
  ],
  ['04-my-tasks', '/my-tasks', 'Мои задачи', 'PAY-101', 438, 873],
  [
    '05-sprint-kpi',
    '/kpi?board=1&sprint=12',
    'KPI',
    'Сгорание спринта, SP',
    1600,
    1440,
  ],
];
const output = fileURLToPath(new URL('../reports/portfolio/', import.meta.url));
const configFile = fileURLToPath(new URL('../vite.config.ts', import.meta.url));

process.env.VITE_API_URL = '/api/v1';
process.env.VITE_SENTRY_DSN = '';
const server = await createServer({
  configFile,
  server: { host: '127.0.0.1', port: 0, open: false, hmr: false },
});

let browser;
try {
  await server.listen();
  const baseUrl = server.resolvedUrls.local[0];
  browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    locale: 'ru-RU',
    timezoneId: 'Asia/Novosibirsk',
    reducedMotion: 'reduce',
  });
  const unmatched = await mockBrowserApi(context, {
    now: Date.parse(DEMO_NOW),
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.clock.setFixedTime(new Date(DEMO_NOW));
  await mkdir(output, { recursive: true });

  for (const [filename, route, title, readyText, width, height] of screens) {
    await page.setViewportSize({ width, height });
    await page.goto(new URL(route, baseUrl).href);
    const main = page.getByRole('main');
    await page
      .getByRole('heading', { level: 1, name: title, exact: true })
      .waitFor();
    await main
      .getByText(readyText, { exact: true })
      .filter({ visible: true })
      .first()
      .waitFor();
    await page.evaluate(() => globalThis.document.fonts.ready);
    assert.deepEqual(unmatched, [], 'API requests without a fixture');
    assert.deepEqual(pageErrors, [], 'App errors during capture');
    await page.screenshot({
      path: join(output, `${filename}.png`),
      animations: 'disabled',
      caret: 'hide',
    });
    console.log(`Saved ${filename}.png`);
  }
} finally {
  await browser?.close();
  await server.close();
}
