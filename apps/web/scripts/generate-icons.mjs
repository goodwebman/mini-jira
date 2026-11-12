/**
 * Кодогенератор иконок: `src/shared/ui/icons/raw/*.svg` → типизированные React-компоненты
 * в `src/shared/ui/icons/generated/*.tsx` + реестр `src/shared/ui/icons/registry.ts`.
 *
 * Запуск: `npm run icons:build -w mini-jira`.
 * Флаг `--check` — не писать файлы, а упасть, если сгенерированное разошлось с тем,
 * что на диске (для CI: гарантия, что сгенерированное закоммичено).
 *
 * Исходные svg должны быть «плоскими»: один корневой <svg> с viewBox и набором
 * примитивов внутри (path/circle/line/rect/polyline/polygon). Презентационные атрибуты
 * (stroke, fill …) навешивает обёртка createIcon; hyphen-case атрибуты внутренних узлов
 * автоматически переводятся в camelCase для JSX.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ICONS_DIR = join(ROOT, 'src', 'shared', 'ui', 'icons');
const RAW_DIR = join(ICONS_DIR, 'raw');
const GEN_DIR = join(ICONS_DIR, 'generated');
const REGISTRY_FILE = join(ICONS_DIR, 'registry.ts');

const CHECK_ONLY = process.argv.includes('--check');
const BANNER =
  '// АВТОГЕНЕРАЦИЯ — не редактировать руками. Источник: src/shared/ui/icons/raw. Пересобрать: `npm run icons:build`.';

/** `chevron-down` → `ChevronDown` */
export const toPascal = (name) =>
  name.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

/** Извлекает viewBox и внутреннюю разметку из svg-строки. */
export function parseSvg(svg, file) {
  const viewBox = /viewBox\s*=\s*"([^"]*)"/i.exec(svg)?.[1];
  if (!viewBox) throw new Error(`[${file}] отсутствует viewBox`);

  const inner = /<svg\b[^>]*>([\s\S]*?)<\/svg>/i.exec(svg)?.[1];
  if (inner == null)
    throw new Error(`[${file}] не найден корневой <svg>…</svg>`);

  return { viewBox: viewBox.trim(), inner };
}

/** hyphen-case имена атрибутов → camelCase (stroke-width → strokeWidth). */
export function attrsToJsx(inner) {
  return inner.replace(
    /(\s)([a-zA-Z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)+)(\s*=)/g,
    (_, ws, name, eq) =>
      ws + name.replace(/-([a-zA-Z0-9])/g, (__, c) => c.toUpperCase()) + eq,
  );
}

/** Нормализует внутренние узлы в аккуратные строки с отступом. */
function formatInner(inner) {
  return attrsToJsx(inner)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `      ${l}`)
    .join('\n');
}

export function buildComponent(name, viewBox, inner) {
  const Pascal = toPascal(name);
  // Исходники плоские; одиночный самозакрывающийся SVG-примитив не нуждается во Fragment.
  const children =
    /^\s*<(?:path|circle|line|rect|polyline|polygon)\b[^>]*\/>\s*$/.test(inner)
      ? `  ${inner.trim()}`
      : `  <>\n${inner}\n  </>`;
  return `${BANNER}
import { createIcon } from '../create-icon';

export const ${Pascal} = createIcon(
  '${name}',
  '${viewBox}',
${children},
);
`;
}

function buildGeneratedIndex(names) {
  const lines = names.map((n) => `export { ${toPascal(n)} } from './${n}';`);
  return `${BANNER}\n${lines.join('\n')}\n`;
}

function buildRegistry(names) {
  const imports = names.map(
    (n) => `import { ${toPascal(n)} } from './generated/${n}';`,
  );
  const entries = names.map((n) => `  ${toPascal(n)},`);
  return `${BANNER}
import type { UIIconComponent } from './create-icon';
${imports.join('\n')}

/**
 * Реестр иконок кита. Ключи совпадают с именами компонентов: \`<UIIcons.ChevronDown />\`.
 * Для tree-shaking бери именованный компонент: \`import { ChevronDown } from '@/shared/ui/icons'\`.
 */
export const UIIcons = {
${entries.join('\n')}
} satisfies Record<string, UIIconComponent>;

export type UIIconName = keyof typeof UIIcons;
`;
}

function writeOrCheck(path, content, diffs) {
  let current;
  try {
    // git на Windows может выдать CRLF — на смысл файла это не влияет
    current = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    current = null;
  }
  if (current === content) return;
  if (CHECK_ONLY) {
    diffs.push(path);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function main() {
  const files = readdirSync(RAW_DIR)
    .filter((f) => f.endsWith('.svg'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) throw new Error(`Нет svg в ${RAW_DIR}`);

  const names = [];
  const diffs = [];

  for (const file of files) {
    const name = basename(file, '.svg');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      throw new Error(`[${file}] имя должно быть kebab-case ([a-z0-9-])`);
    }
    const svg = readFileSync(join(RAW_DIR, file), 'utf8');
    const { viewBox, inner } = parseSvg(svg, file);
    writeOrCheck(
      join(GEN_DIR, `${name}.tsx`),
      buildComponent(name, viewBox, formatInner(inner)),
      diffs,
    );
    names.push(name);
  }

  writeOrCheck(join(GEN_DIR, 'index.ts'), buildGeneratedIndex(names), diffs);
  writeOrCheck(REGISTRY_FILE, buildRegistry(names), diffs);

  if (CHECK_ONLY && diffs.length > 0) {
    const changed = diffs.map((d) => `  - ${d}`).join('\n');
    console.error(
      `Сгенерированные иконки устарели. Запусти \`npm run icons:build\`:\n${changed}`,
    );
    process.exit(1);
  }

  console.log(
    `✓ Иконки собраны: ${String(names.length)} шт. → src/shared/ui/icons/generated`,
  );
}

// Запускаем генерацию только при прямом вызове скрипта, не при импорте в тестах.
const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
