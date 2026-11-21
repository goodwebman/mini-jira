import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

import { mockResponsiveApi } from './responsive-fixtures.mjs';

const viewports = [
  [320, 568],
  [375, 667],
  [438, 844],
  [640, 360],
  [640, 800],
  [960, 720],
  [1280, 800],
  [1440, 900],
  [1600, 900],
  [1920, 1080],
  [2560, 1440],
  [3840, 2160],
];
const screens = [
  ['login', '/login', /^Вход в аккаунт$/],
  ['register', '/register', /^Регистрация$/],
  ['boards', '/boards', /^Доски$/, 'Платёжная платформа и личный кабинет'],
  [
    'board',
    '/boards/1',
    /^Платёжная платформа/,
    '[data-name="UITaskCard"]:visible',
  ],
  [
    'members',
    '/boards/1/members',
    /^Участники доски$/,
    'Дмитрий Константинопольский',
  ],
  [
    'task',
    '/boards/1/tasks/PAY-101',
    /^PAY-101$/,
    /Проверить сценарий повторной оплаты/,
  ],
  ['my-tasks', '/my-tasks', /^Мои задачи$/, 'PAY-101'],
  ['kpi', '/kpi?board=1&sprint=12', /^KPI$/, 'Сгорание спринта, SP'],
  ['profile', '/profile', /^Профиль$/, 'Александра Воронцова'],
  ['not-found', '/unknown-page', /^Страница не найдена$/],
];
const baseUrl = process.env.RESPONSIVE_URL ?? 'http://127.0.0.1:4187';
const screenshots = process.env.RESPONSIVE_SCREENSHOTS;
const issues = [];
const browser = await chromium.launch(
  process.env.RESPONSIVE_CHANNEL
    ? { channel: process.env.RESPONSIVE_CHANNEL }
    : {},
);

try {
  for (const [width, height] of viewports) {
    let navigationType = 'UISideNav';
    if (width < 960) navigationType = 'UITabBar';
    if (width < 640) navigationType = 'UIBottomNav';
    for (const authenticated of [false, true]) {
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: 'reduce',
        hasTouch: width < 960,
      });
      // Проверяем системный font stack без ожидания внешнего CDN.
      await context.route('https://fonts.googleapis.com/**', (route) =>
        route.abort(),
      );
      await mockResponsiveApi(context, authenticated);
      const page = await context.newPage();
      page.setDefaultTimeout(7000);
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      for (const [name, url, heading, ready] of authenticated
        ? screens.slice(2)
        : screens.slice(0, 2)) {
        try {
          await page.goto(new URL(url, baseUrl).href);
          await page
            .getByRole('heading', { level: 1, name: heading })
            .waitFor({ timeout: 7000 });
          if (ready) {
            const main = page.getByRole('main');
            const locator =
              typeof ready === 'string' && ready.startsWith('[')
                ? main.locator(ready)
                : main.getByText(ready, { exact: typeof ready === 'string' });
            await locator.filter({ visible: true }).first().waitFor();
          }
          const navigation = page.getByRole('navigation', {
            name: 'Основная навигация',
          });
          if (authenticated) {
            assert.equal(await navigation.count(), 1, 'one visible navigation');
            await page
              .locator(`[data-name="${navigationType}"]`)
              .filter({ visible: true })
              .waitFor();
            await page
              .getByRole('button', { name: 'Уведомления, непрочитанных: 1' })
              .waitFor();
          }
          await checkLayout(page);
          if (screenshots) {
            await page.screenshot({
              path: join(screenshots, `${width}x${height}-${name}.png`),
              timeout: 10000,
            });
          }
          await checkInteractions(page, width, name);
        } catch (error) {
          issues.push(`${width}x${height} ${name}: ${error.message}`);
          if (screenshots)
            await page.screenshot({
              path: join(screenshots, `${width}x${height}-${name}-failed.png`),
              timeout: 10000,
            });
        }
      }
      issues.push(...pageErrors.map((error) => `${width} browser: ${error}`));
      await context.close();
    }
    console.log(`${width} × ${height} checked`);
  }
} finally {
  await browser.close();
}

if (issues.length && screenshots) {
  await mkdir(screenshots, { recursive: true });
  await writeFile(join(screenshots, 'issues.txt'), issues.join('\n'));
}
assert.equal(issues.length, 0, issues.join('\n'));

async function checkLayout(page) {
  const overflowing = await page.evaluate(() => {
    const selectors = ['html', 'main', 'header', '[role="dialog"]'];
    return [...globalThis.document.querySelectorAll(selectors.join(','))]
      .filter(
        (element) =>
          element.clientWidth && element.scrollWidth - element.clientWidth > 2,
      )
      .map(
        (element) =>
          `${element.tagName} ${element.scrollWidth} > ${element.clientWidth}`,
      );
  });
  assert.deepEqual(
    overflowing,
    [],
    'horizontal overflow outside an explicitly scrollable component',
  );
}

async function checkInteractions(page, width, name) {
  if (name === 'login' || name === 'register') {
    const next = name === 'login' ? 'Зарегистрироваться' : 'Войти';
    await page.getByRole('link', { name: next, exact: true }).click();
    await page
      .getByRole('heading', {
        name: name === 'login' ? 'Регистрация' : 'Вход в аккаунт',
        exact: true,
      })
      .waitFor();
  }
  if (name === 'boards') {
    await checkDialog(
      page,
      page.getByRole('button', { name: 'Создать доску' }),
      'Новая доска',
    );
    await checkDialog(
      page,
      page.getByRole('button', { name: /Уведомления, непрочитанных/ }),
      'Уведомления',
      'Закрыть панель',
    );
  }
  if (name === 'board') {
    await checkDialog(
      page,
      page.getByRole('button', { name: 'Создать задачу' }),
      'Новая задача',
    );
    await checkDialog(
      page,
      page.getByRole('button', { name: /^Платёжная платформа/ }),
      'Доски задач',
      'Закрыть панель',
    );
    const people = page.getByRole('group', { name: 'Фильтр по участникам' });
    const all = people.getByRole('button', { name: 'Все', exact: true });
    const member = people.getByRole('button', { name: /Дмитрий$/ });
    await checkChipLayout(people, member);
    await checkChipLayout(people, all);
    if (width < 640) {
      const columns = page.getByRole('group', { name: 'Колонка' });
      const chip = columns.getByRole('button', { name: /^Готово / });
      await checkChipLayout(columns, chip);
      await page
        .getByRole('link', { name: /Открыть задачу PAY-105/ })
        .waitFor();
      const card = page.getByRole('link', { name: /Открыть задачу PAY-115/ });
      await card.scrollIntoViewIfNeeded();
      await card.click({ trial: true });
    } else {
      const lastCard = page.getByRole('link', {
        name: /Открыть задачу PAY-105/,
      });
      await lastCard.scrollIntoViewIfNeeded();
      await lastCard.click({ trial: true });
    }
  }
  if (name === 'members') {
    const role = page.getByRole('combobox', { name: /Роль: Дмитрий/ });
    await role.press('Space');
    const listbox = page.getByRole('listbox', { name: /Роль: Дмитрий/ });
    await listbox.waitFor();
    await checkViewportBounds(listbox);
    await role.press('Escape');
    await listbox.waitFor({ state: 'hidden' });
  }
  if (name === 'task') {
    await checkDialog(
      page,
      page.getByRole('button', { name: 'Редактировать задачу' }),
      'Редактирование задачи',
    );
    const history = page.getByText(/История статусов и пауз/);
    await history.click();
    assert.equal(await history.locator('..').getAttribute('open'), '');
  }
  if (name === 'my-tasks') {
    const pager = page.getByRole('navigation', { name: 'Страницы' });
    await pager.getByRole('button', { name: 'Дальше' }).click();
    await pager.getByText('Страница 2 из 3').waitFor();
  }
  if (name === 'kpi') {
    await checkDialog(
      page,
      page.getByRole('button', { name: /Платёжная платформа.*Спринт 12/ }),
      'Доска и спринт',
    );
  }
  if (name === 'not-found') {
    await page.getByRole('link', { name: 'К списку досок' }).click();
    await page.getByRole('heading', { name: 'Доски', exact: true }).waitFor();
  }
}

async function checkChipLayout(group, chip) {
  await group.evaluate((row) => {
    // У Arial ширина текста зависит от насыщенности шрифта.
    row.style.fontFamily = 'Arial, sans-serif';
  });
  const measure = () =>
    group.evaluate((row) => {
      const groupRect = row.getBoundingClientRect();
      return [...row.querySelectorAll('[data-name="UIChip"]')].map((button) => {
        const { x, y, width, height } = button.getBoundingClientRect();
        // Клик может прокрутить группу до чипа, не меняя раскладку.
        return {
          x: x - groupRect.x + row.scrollLeft,
          y: y - groupRect.y + row.scrollTop,
          width,
          height,
        };
      });
    });
  assert.equal(await chip.getAttribute('aria-pressed'), 'false');
  const before = await measure();
  await chip.click();
  assert.equal(await chip.getAttribute('aria-pressed'), 'true');
  assert.deepEqual(
    await measure(),
    before,
    'chip sizes and positions stay stable',
  );
}

async function checkDialog(page, trigger, name, closeLabel = 'Закрыть') {
  await trigger.click();
  const dialog = page.getByRole('dialog', { name, exact: true });
  await dialog.waitFor();
  const close = dialog.getByRole('button', { name: closeLabel, exact: true });
  await close.click({ trial: true });
  await checkViewportBounds(dialog);
  await checkLayout(page);
  await close.click();
  await dialog.waitFor({ state: 'hidden' });
}

async function checkViewportBounds(locator) {
  const inViewport = await locator.evaluate((element) => {
    const { left, top, right, bottom } = element.getBoundingClientRect();
    return (
      left >= -1 &&
      top >= -1 &&
      right <= globalThis.innerWidth + 1 &&
      bottom <= globalThis.innerHeight + 1
    );
  });
  assert.ok(inViewport, 'the overlay stays within the viewport');
}
