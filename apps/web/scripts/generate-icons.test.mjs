/**
 * Тесты логики кодогенератора (без записи на диск).
 * Vitest не подхватывает .mjs напрямую — запускается через node:test:
 *   `npm run icons:test`
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  attrsToJsx,
  buildComponent,
  parseSvg,
  toPascal,
} from './generate-icons.mjs';

test('buildComponent: один SVG-примитив без Fragment, несколько с Fragment', () => {
  const single = buildComponent('test', '0 0 24 24', '      <path d="M1 1"/>');
  assert.ok(single.includes('<path d="M1 1"/>'));
  assert.ok(!single.includes('<>'));
  const multiple = buildComponent(
    'test',
    '0 0 24 24',
    '      <path/><circle/>',
  );
  assert.ok(multiple.includes('<>'));
  assert.ok(multiple.includes('<path/><circle/>'));
});

test('toPascal: kebab → PascalCase', () => {
  assert.equal(toPascal('chevron-down'), 'ChevronDown');
  assert.equal(toPascal('x'), 'X');
  assert.equal(toPascal('arrow-left-right'), 'ArrowLeftRight');
});

test('parseSvg: достаёт viewBox и inner', () => {
  const svg = '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>';
  const { viewBox, inner } = parseSvg(svg, 'x.svg');
  assert.equal(viewBox, '0 0 24 24');
  assert.ok(inner.includes('<path'));
});

test('parseSvg: бросает на svg без viewBox', () => {
  assert.throws(() => parseSvg('<svg><path/></svg>', 'bad.svg'), /viewBox/);
});

test('attrsToJsx: переводит hyphen-атрибуты в camelCase', () => {
  const out = attrsToJsx('<path stroke-width="2" stroke-linecap="round"/>');
  assert.ok(out.includes('strokeWidth'));
  assert.ok(out.includes('strokeLinecap'));
  assert.ok(!out.includes('stroke-width'));
});
