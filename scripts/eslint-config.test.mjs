import js from '@eslint/js';
import { ESLint } from 'eslint';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import effects from 'eslint-plugin-react-you-might-not-need-an-effect';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

import config from '../eslint.config.js';
import lintStaged from '../lint-staged.config.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const realEslint = new ESLint({ cwd: repoRoot });
const root = await mkdtemp(path.join(os.tmpdir(), 'mini-jira-eslint-'));
after(() => rm(root, { recursive: true, force: true }));
const src = 'apps/web/src';
const layers = ['shared', 'entities', 'features', 'widgets', 'pages', 'app'];
const fixture = async (file, code = 'export const value = 1;\n') => {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, code);
};

await fixture(
  'tsconfig.json',
  JSON.stringify({
    compilerOptions: { paths: { '@/*': ['./apps/web/src/*'] } },
  }),
);
for (const layer of layers) {
  for (const slice of ['alpha', 'beta']) {
    await fixture(`${src}/${layer}/${slice}/index.ts`);
    await fixture(`${src}/${layer}/${slice}/internal.ts`);
  }
}
await fixture(`${src}/entities/auth/testing.ts`);
await fixture(`${src}/utils/value.ts`);
await fixture(`${src}/index.css`, 'body {}');
await fixture(`${src}/shared/styles/theme.css`, 'body {}');
await fixture(`${src}/widgets/beta/styles.css`, '.widget {}');
await fixture(
  `${src}/shared/api/cycle-a.ts`,
  "export { b } from './cycle-b';\nexport const a = 1;\n",
);
await fixture(
  `${src}/shared/api/cycle-b.ts`,
  "export { a } from './cycle-a';\nexport const b = 1;\n",
);

// Use the real config with isolated files; type-aware rules are checked below in real TS projects.
const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: true,
  overrideConfig: [
    ...config,
    {
      files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
      languageOptions: { parserOptions: { project: false } },
      settings: {
        'boundaries/root-path': root,
        'import/resolver': {
          typescript: { project: path.join(root, 'tsconfig.json') },
        },
        'import-x/resolver': {
          typescript: { project: path.join(root, 'tsconfig.json') },
        },
      },
      rules: {
        '@typescript-eslint/await-thenable': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
      },
    },
  ],
});

async function ruleIds(file, code) {
  const [result] = await eslint.lintText(code, {
    filePath: path.join(root, src, file),
  });
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
  return result.messages.map((message) => message.ruleId);
}

for (const [fromIndex, from] of layers.entries()) {
  for (const [toIndex, to] of layers.entries()) {
    if (from === to) continue;
    for (const source of [`@/${to}/beta`, `../../${to}/beta`]) {
      test(`${from} -> ${to} via ${source}`, async () => {
        const ids = await ruleIds(
          `${from}/alpha/check.ts`,
          `export { value } from '${source}';`,
        );
        assert.equal(
          ids.includes('boundaries/dependencies'),
          toIndex > fromIndex,
          JSON.stringify(ids),
        );
        assert.ok(!ids.includes('import-x/no-unresolved'), JSON.stringify(ids));
        if (toIndex < fromIndex) assert.deepEqual(ids, []);
      });
    }
  }
}

for (const layer of ['entities', 'features', 'widgets', 'pages']) {
  test(`${layer}: sibling slices are isolated, even for type imports`, async () => {
    const ids = await ruleIds(
      `${layer}/alpha/check.ts`,
      `import type { value } from '@/${layer}/beta'; export type T = typeof value;`,
    );
    assert.ok(ids.includes('boundaries/dependencies'), JSON.stringify(ids));
  });
  test(`${layer}: deep imports are blocked`, async () => {
    const ids = await ruleIds(
      'app/check.ts',
      `export { value } from '@/${layer}/alpha/internal';`,
    );
    assert.ok(ids.includes('boundaries/dependencies'), JSON.stringify(ids));
  });
  test(`${layer}: slice internals can use relative imports`, async () => {
    assert.deepEqual(
      await ruleIds(
        `${layer}/alpha/check.ts`,
        "export { value } from './internal';",
      ),
      [],
    );
  });
}

// These cases exercise the installed plugins through the same config as application code.
for (const [rule, invalid, valid] of [
  [
    'no-nested-ternary',
    'export const value = a ? b : c ? d : e;',
    'export const value = a ? b : c;',
  ],
  [
    'default-case-last',
    'export function run(x) { switch(x) { default: return 0; case 1: return 1; } }',
    'export function run(x) { switch(x) { case 1: return 1; default: return 0; } }',
  ],
  [
    'no-else-return',
    'export function run(x) { if(x) { return 1; } else { return 2; } }',
    'export function run(x) { if(x) return 1; return 2; }',
  ],
  [
    'no-implicit-coercion',
    'export const value = !!input;',
    'export const value = Boolean(input);',
  ],
  [
    'no-param-reassign',
    'export function run(x) { x = 1; return x; }',
    'export function run(x) { return x + 1; }',
  ],
  [
    'no-unreachable-loop',
    'export function run(xs) { for (const x of xs) { return x; } }',
    'export function run(xs) { for (const x of xs) { console.log(x); } }',
  ],
  [
    'object-shorthand',
    'export const obj = { value: value };',
    'export const obj = { value };',
  ],
  [
    'prefer-template',
    'export const value = "hello " + name;',
    'export const value = `hello ${name}`;',
  ],
  [
    'unused-imports/no-unused-imports',
    "import { value } from '@/entities/alpha';",
    "export { value } from '@/entities/alpha';",
  ],
  [
    'unused-imports/no-unused-vars',
    'const unused = 1;',
    'export const used = 1;',
  ],
  [
    'sonarjs/no-collapsible-if',
    'export function run(a,b) { if(a) { if(b) console.log(a); } }',
    'export function run(a,b) { if(a && b) console.log(a); }',
  ],
  [
    'sonarjs/no-identical-functions',
    'export function one(x) {\n const y=x+1;\n console.log(y);\n return y*2;\n }\n export function two(x) {\n const y=x+1;\n console.log(y);\n return y*2;\n }',
    'export function one(x) { return x+1; } export function two(x) { return x+2; }',
  ],
  [
    'sonarjs/no-nested-template-literals',
    'export const value = `hello ${format(`name ${name}`)}`;',
    'const formatted = format(`name ${name}`); export const value = `hello ${formatted}`;',
  ],
  [
    'sonarjs/prefer-immediate-return',
    'export function run() { const value = Math.random(); return value; }',
    'export function run() { return Math.random(); }',
  ],
  [
    'sonarjs/no-duplicate-string',
    'export const a = read("repeated long string"); export const b = read("repeated long string"); export const c = read("repeated long string");',
    'const key = "repeated long string"; export const a=read(key); export const b=read(key); export const c=read(key);',
  ],
  [
    'unicorn/no-useless-undefined',
    'export function run() { return undefined; }',
    'export function run() { return; }',
  ],
  [
    'unicorn/no-zero-fractions',
    'export const value = 1.0;',
    'export const value = 1;',
  ],
  [
    'unicorn/prefer-array-find',
    'export const value = items.filter(x => x.active)[0];',
    'export const value = items.find(x => x.active);',
  ],
  [
    'unicorn/prefer-logical-operator-over-ternary',
    'export const value = input ? input : fallback;',
    'export const value = input || fallback;',
  ],
  [
    'unicorn/prefer-string-starts-ends-with',
    'export const value = /^hello/.test(input);',
    'export const value = input.startsWith("hello");',
  ],
  [
    'unicorn/prefer-structured-clone',
    'export const value = JSON.parse(JSON.stringify(input));',
    'export const value = structuredClone(input);',
  ],
  [
    'unicorn/prefer-top-level-await',
    '(async () => { await Promise.resolve(); })();',
    'await Promise.resolve();',
  ],
  [
    'perfectionist/sort-enums',
    'export enum Values { Zebra = "z", Alpha = "a" }',
    'export enum Values { Alpha = "a", Zebra = "z" }',
  ],
  [
    'perfectionist/sort-union-types',
    'export type Value = "zebra" | "alpha";',
    'export type Value = "alpha" | "zebra";',
  ],
  [
    'import-x/first',
    "const x=1; import { value } from '@/entities/alpha'; export {x,value};",
    "import { value } from '@/entities/alpha';\n\nexport const x=value;",
  ],
  [
    'import-x/newline-after-import',
    "import { value } from '@/entities/alpha';\nexport const x=value;",
    "import { value } from '@/entities/alpha';\n\nexport const x=value;",
  ],
  [
    'import-x/no-duplicates',
    "import { value } from '@/entities/alpha'; import { value as other } from '@/entities/alpha'; export {value,other};",
    "import { value, value as other } from '@/entities/alpha';\n\nexport {value,other};",
  ],
  [
    '@eslint-react/no-array-index-key',
    'export function Screen({items}) { return items.map((item,index) => <div key={index}>{item}</div>); }',
    'export function Screen({items}) { return items.map(item => <div key={item.id}>{item.name}</div>); }',
  ],
  [
    '@eslint-react/no-missing-key',
    'export function Screen({items}) { return items.map(item => <div>{item.name}</div>); }',
    'export function Screen({items}) { return items.map(item => <div key={item.id}>{item.name}</div>); }',
  ],
  [
    '@eslint-react/no-duplicate-key',
    'export function Screen() { return [<div key="a"/>, <span key="a"/>]; }',
    'export function Screen() { return [<div key="a"/>, <span key="b"/>]; }',
  ],
  [
    '@eslint-react/no-nested-component-definitions',
    'export function Screen() { function Inner() { return <div/>; } return <Inner/>; }',
    'function Inner() { return <div/>; } export function Screen() { return <Inner/>; }',
  ],
  [
    '@eslint-react/no-unstable-context-value',
    'export function Screen() { return <Context.Provider value={{foo:1}}/>; }',
    'const data={foo:1}; export function Screen() { return <Context.Provider value={data}/>; }',
  ],
  [
    '@eslint-react/no-unstable-default-props',
    'export function Screen({items=[]}) { return <div>{items.length}</div>; }',
    'const empty=[]; export function Screen({items=empty}) { return <div>{items.length}</div>; }',
  ],
  [
    '@eslint-react/jsx-no-useless-fragment',
    'export function Screen() { return <><div/></>; }',
    'export function Screen() { return <div/>; }',
  ],
  [
    '@eslint-react/dom-no-dangerously-set-innerhtml',
    'export function Screen() { return <div dangerouslySetInnerHTML={{__html:html}}/>; }',
    'export function Screen() { return <div>{text}</div>; }',
  ],
  [
    'tailwindcss/enforces-shorthand',
    'export const node=<div className="h-4 w-4"/>;',
    'export const node=<div className="size-4"/>;',
  ],
  [
    'tailwindcss/no-contradicting-classname',
    'export const node=<div className="flex block"/>;',
    'export const node=<div className="flex"/>;',
  ],
  [
    'compat/compat',
    'export const port = navigator.serial.requestPort();',
    'export const mapped = items.map(item => item.kind);',
  ],
  [
    'eslint-comments/require-description',
    '/* eslint-disable no-debugger */\ndebugger;',
    '/* eslint-disable no-debugger -- Intentional test example. */\ndebugger;',
  ],
  [
    'eslint-comments/no-unlimited-disable',
    '/* eslint-disable -- Intentional example. */\ndebugger;',
    '/* eslint-disable no-debugger -- Intentional test example. */\ndebugger;',
  ],
  [
    'eslint-comments/no-duplicate-disable',
    '/* eslint-disable no-debugger -- Intentional test example. */\n/* eslint-disable no-debugger -- Intentional test example. */\ndebugger;',
    '/* eslint-disable no-debugger -- Intentional test example. */\ndebugger;',
  ],
]) {
  test(`${rule}: rejects a violation and permits the alternative`, async () => {
    assert.ok((await ruleIds('app/example.tsx', invalid)).includes(rule), rule);
    assert.ok(!(await ruleIds('app/example.tsx', valid)).includes(rule), rule);
  });
}

test('self-import and useless relative path segments are rejected', async () => {
  await fixture(`${src}/entities/alpha/nested/index.ts`);
  assert.ok(
    (
      await ruleIds(
        'entities/alpha/index.ts',
        "export { value } from '@/entities/alpha';",
      )
    ).includes('import-x/no-self-import'),
  );
  assert.ok(
    (
      await ruleIds(
        'entities/alpha/check.ts',
        "export { value } from './nested/../internal';",
      )
    ).includes('import-x/no-useless-path-segments'),
  );
});

test('effect anti-pattern rules are all enabled only for runtime React code', async () => {
  for (const file of [
    'apps/web/src/app/App.tsx',
    'apps/web/src/app/auth-integration.test.tsx',
    'apps/api/src/app.ts',
  ]) {
    const effective = await realEslint.calculateConfigForFile(
      path.join(repoRoot, file),
    );
    for (const rule of Object.keys(effects.rules)) {
      assert.equal(
        severity(effective.rules[`react-you-might-not-need-an-effect/${rule}`]),
        file.endsWith('/App.tsx') ? 2 : undefined,
        `${file}: ${rule}`,
      );
    }
  }
});

for (const [rule, body] of [
  [
    'no-derived-state',
    'export function Screen() { const [first,setFirst]=useState("Nick"); const [last,setLast]=useState("Name"); const [full,setFull]=useState(""); useEffect(()=>{setFull(first + " " + last);},[first,last]); return <div onClick={()=>{setFirst("A");setLast("B");}}>{full}</div>; }',
  ],
  [
    'no-chain-state-updates',
    'export function Screen() { const [round,setRound]=useState(1); const [over,setOver]=useState(false); useEffect(()=>{if(round>10)setOver(true);},[round]); return <div onClick={()=>setRound(round+1)}>{String(over)}</div>; }',
  ],
  [
    'no-event-handler',
    'export function Screen() { const [data,setData]=useState(); useEffect(()=>{if(data)submitData(data);},[data]); return <button onClick={()=>setData({})}/>; }',
  ],
  [
    'no-adjust-state-on-prop-change',
    'export function Screen({items}) { const [reverse,setReverse]=useState(false); const [selection,setSelection]=useState(null); useEffect(()=>{setSelection(null);},[items]); return <div onClick={()=>{setReverse(!reverse);setSelection(items[0]);}}>{selection}</div>; }',
  ],
  [
    'no-reset-all-state-on-prop-change',
    'export function Screen({items}) { const [selection,setSelection]=useState(null); useEffect(()=>{setSelection(null);},[items]); return <div onClick={()=>setSelection(items[0])}>{selection}</div>; }',
  ],
  [
    'no-pass-live-state-to-parent',
    'export function Screen({onChanged}) { const [text,setText]=useState(); useEffect(()=>{onChanged(text);},[onChanged,text]); return <button onClick={()=>setText("x")}/>; }',
  ],
  [
    'no-pass-data-to-parent',
    'export function Screen({onFetched}) { const {data}=useQuery("/data"); useEffect(()=>{onFetched(data);},[data,onFetched]); return <div/>; }',
  ],
  [
    'no-external-store-subscription',
    'export function useOnlineStatus() { const [online,setOnline]=useState(true); useEffect(()=>{ function update(){setOnline(navigator.onLine);} update(); window.addEventListener("online",update); return ()=>window.removeEventListener("online",update); },[]); return online; }',
  ],
  [
    'no-initialize-state',
    'export function Screen() { const [value,setValue]=useState(); useEffect(()=>{setValue("hello");},[]); return <div>{value}</div>; }',
  ],
]) {
  test(`effect anti-pattern ${rule} is detected`, async () => {
    const ruleId = `react-you-might-not-need-an-effect/${rule}`;
    const code = `import { useEffect, useState } from 'react';\n\n${body}`;
    assert.ok(
      (await ruleIds('app/effects.tsx', code)).includes(ruleId),
      ruleId,
    );
    assert.ok(
      !(
        await ruleIds(
          'app/effects.tsx',
          'export function Screen() { return <div/>; }',
        )
      ).includes(ruleId),
    );
  });
}

test('compatibility uses the project browser baseline and excludes tests', async () => {
  const pkg = JSON.parse(
    await readFile(path.join(repoRoot, 'package.json'), 'utf8'),
  );
  const runtime = await realEslint.calculateConfigForFile(
    path.join(repoRoot, 'apps/web/src/app/App.tsx'),
  );
  assert.deepEqual(runtime.settings.browsers, pkg.browserslist);
  assert.equal(runtime.settings.lintAllEsApis, true);
  const ids = await ruleIds(
    'app/example.test.tsx',
    'export const port=navigator.serial.requestPort();',
  );
  assert.ok(!ids.includes('compat/compat'));
});

test('shared and app may import within their own layer', async () => {
  for (const layer of ['shared', 'app']) {
    assert.deepEqual(
      await ruleIds(
        `${layer}/alpha/check.ts`,
        `export { value } from '@/${layer}/beta/internal';`,
      ),
      [],
    );
  }
});

for (const code of [
  "import { value } from '@/widgets/beta'; export { value };",
  "export * from '@/widgets/beta';",
  "export { value } from '../../widgets/beta';",
  "export const load = () => import('@/widgets/beta');",
]) {
  test(`shared cannot depend on widgets: ${code}`, async () => {
    assert.ok(
      (await ruleIds('shared/alpha/check.ts', code)).includes(
        'boundaries/dependencies',
      ),
    );
  });
}

test('test-only auth entry is allowed only in app tests', async () => {
  assert.deepEqual(
    await ruleIds(
      'app/check.test.ts',
      "export { value } from '@/entities/auth/testing';",
    ),
    [],
  );
  for (const file of [
    'app/check.ts',
    'shared/alpha/check.test.ts',
    'entities/alpha/check.test.ts',
  ]) {
    assert.ok(
      (
        await ruleIds(file, "export { value } from '@/entities/auth/testing';")
      ).includes('boundaries/dependencies'),
      file,
    );
  }
});

test('styles cannot bypass layer boundaries', async () => {
  assert.ok(
    (
      await ruleIds(
        'shared/alpha/check.ts',
        "import '@/widgets/beta/styles.css';",
      )
    ).includes('boundaries/dependencies'),
  );
});

test('unknown folders cannot bypass FSD', async () => {
  assert.ok(
    (await ruleIds('utils/check.ts', 'export const value = 1;')).includes(
      'boundaries/no-unknown-files',
    ),
  );
});

test('unresolved imports fail', async () => {
  assert.ok(
    (
      await ruleIds('app/check.ts', "export * from '@/widgets/missing';")
    ).includes('import-x/no-unresolved'),
  );
});

test('cycles are detected through TypeScript re-exports', async () => {
  assert.ok(
    (
      await ruleIds(
        'shared/api/cycle-a.ts',
        "export { b } from './cycle-b'; export const a = 1;",
      )
    ).includes('import-x/no-cycle'),
  );
});

test('browser runtime has no Node globals', async () => {
  assert.ok(
    (await ruleIds('app/check.js', 'process.exit(1);')).includes('no-undef'),
  );
});

test('portable auth core restrictions remain enabled', async () => {
  const ids = await ruleIds(
    'entities/auth/lib/check.ts',
    "import { useState } from 'react'; window.alert(useState);",
  );
  assert.ok(ids.includes('no-restricted-imports'));
  assert.ok(ids.includes('no-restricted-globals'));
});

for (const file of [
  'apps/web/src/app/init-auth.ts',
  'apps/web/src/app/query/queryClient.test.ts',
  'apps/api/src/app.ts',
  'apps/api/test/auth.test.ts',
  'packages/contracts/src/index.ts',
  'packages/contracts/test/requests.test.ts',
]) {
  for (const [rule, invalid, valid] of [
    [
      'no-floating-promises',
      'Promise.resolve(1);',
      'await Promise.resolve(1); void Promise.resolve(2);',
    ],
    ['await-thenable', 'await 1;', 'await Promise.resolve(1);'],
    [
      'no-misused-promises',
      'export const handle: () => void = async () => {};',
      'export const handle: () => Promise<void> = async () => {};',
    ],
  ]) {
    test(`${file}: ${rule} rejects invalid code and accepts valid code`, async () => {
      const ruleId = `@typescript-eslint/${rule}`;
      for (const [code, shouldFail] of [
        [invalid, true],
        [valid, false],
      ]) {
        const [result] = await realEslint.lintText(code, {
          filePath: path.join(repoRoot, file),
        });
        assert.equal(
          result.fatalErrorCount,
          0,
          JSON.stringify(result.messages),
        );
        assert.equal(
          result.messages.some((message) => message.ruleId === ruleId),
          shouldFail,
          JSON.stringify(result.messages),
        );
        if (!shouldFail) assert.deepEqual(result.messages, []);
      }
    });
  }
}

for (const [name, file, invalid, rule, valid] of [
  [
    'base JS rules',
    'app/check.js',
    'missingName();',
    'no-undef',
    'window.alert(document.title);',
  ],
  [
    'base TS rules',
    'app/check.ts',
    'export const value: any = 1;',
    '@typescript-eslint/no-explicit-any',
    'export const value: number = 1;',
  ],
  [
    'unused TS imports',
    'app/check.ts',
    "import { value } from '@/entities/alpha';",
    'unused-imports/no-unused-imports',
    "export { value } from '@/entities/alpha';",
  ],
  [
    'conditional Hooks',
    'app/check.tsx',
    'export function Screen({ show }: { show: boolean }) { if (show) React.useState(0); return null; }',
    'react-hooks/rules-of-hooks',
    'export function Screen() { React.useState(0); return null; }',
  ],
  [
    'effect dependencies',
    'app/check.tsx',
    'export function Screen({ value }: { value: number }) { React.useEffect(() => { console.log(value); }, []); return null; }',
    'react-hooks/exhaustive-deps',
    'export function Screen({ value }: { value: number }) { React.useEffect(() => { console.log(value); }, [value]); return null; }',
  ],
  [
    'Fast Refresh exports',
    'app/check.tsx',
    'export function Screen() { return <div />; } export function helper() { return 1; }',
    'react-refresh/only-export-components',
    'export function Screen() { return <div />; } export const version = 1;',
  ],
]) {
  test(`${name}: negative and positive examples`, async () => {
    assert.ok((await ruleIds(file, invalid)).includes(rule), rule);
    assert.deepEqual(await ruleIds(file, valid), [], rule);
  });
}

for (const source of [
  'react',
  'react-dom/client',
  'axios',
  '@tanstack/react-query',
  '@reduxjs/toolkit',
  '@gwmt/contracts',
  '@/shared/api',
  '../model/auth-instance',
  '../api/auth-api',
]) {
  test(`portable auth rejects ${source}`, async () => {
    assert.ok(
      (
        await ruleIds(
          'entities/auth/lib/check.ts',
          `import { value } from '${source}'; export { value };`,
        )
      ).includes('no-restricted-imports'),
    );
  });
}
for (const name of [
  'window',
  'document',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
]) {
  test(`portable auth rejects direct ${name} access`, async () => {
    assert.ok(
      (
        await ruleIds(
          'entities/auth/lib/check.ts',
          `export const value = ${name};`,
        )
      ).includes('no-restricted-globals'),
    );
  });
}
test('portable auth permits internal imports and injected browser APIs', async () => {
  await fixture(`${src}/entities/auth/lib/internal.ts`);
  assert.deepEqual(
    await ruleIds(
      'entities/auth/lib/check.ts',
      "export { value } from './internal'; export const read = (platform: { now: () => number }) => platform.now();",
    ),
    [],
  );
  assert.deepEqual(
    await ruleIds('app/check.ts', 'export const value = window.location;'),
    [],
  );
});

for (const source of [
  '@/entities/alpha/internal',
  './entities/alpha/internal',
]) {
  test(`bootstrap cannot bypass app: ${source}`, async () => {
    assert.ok(
      (
        await ruleIds('main.tsx', `export { value } from '${source}';`)
      ).includes('boundaries/dependencies'),
    );
  });
}
test('bootstrap can import app and root styles; declarations remain classified', async () => {
  assert.deepEqual(
    await ruleIds(
      'main.tsx',
      "import './index.css';\n\nexport { value } from './app/alpha';",
    ),
    [],
  );
  assert.deepEqual(
    await ruleIds(
      'vite-env.d.ts',
      'declare const version: string; export { version };',
    ),
    [],
  );
});
test('resolved dependency outside known FSD folders fails', async () => {
  assert.ok(
    (
      await ruleIds('app/check.ts', "export { value } from '@/utils/value';")
    ).includes('boundaries/no-unknown-dependencies'),
  );
});
test('raw CSS imports retain their Vite exception', async () => {
  assert.ok(
    !(
      await ruleIds(
        'app/check.ts',
        "export { default as theme } from '@/shared/styles/theme.css?raw';",
      )
    ).includes('import-x/no-unresolved'),
  );
});
test('unused eslint-disable comments fail; necessary ones work', async () => {
  const [unused] = await eslint.lintText(
    '/* eslint-disable no-debugger -- Testing unused directives. */\nexport const value = 1;',
    { filePath: path.join(root, 'scripts/check.mjs') },
  );
  assert.equal(unused.errorCount, 1);
  assert.match(unused.messages[0].message, /Unused eslint-disable/);
  const [used] = await eslint.lintText(
    '/* eslint-disable no-debugger -- Testing necessary directives. */\ndebugger;',
    { filePath: path.join(root, 'scripts/check.mjs') },
  );
  assert.deepEqual(used.messages, []);
});

for (const directory of [
  'dist',
  'dist-ssr',
  'coverage',
  '.vitest',
  '.vercel',
  'node_modules',
]) {
  test(`generated directory ${directory} is ignored, including nested output`, async () => {
    for (const prefix of ['', 'apps/web/']) {
      assert.equal(
        await realEslint.isPathIgnored(
          path.join(repoRoot, prefix, directory, 'bad.ts'),
        ),
        true,
      );
    }
  });
}

const severity = (setting) => {
  const value = Array.isArray(setting) ? setting[0] : setting;
  return { off: 0, warn: 1, error: 2 }[value] ?? value;
};
async function assertPreset(file, rules) {
  const effective = await realEslint.calculateConfigForFile(
    path.join(repoRoot, file),
  );
  for (const [rule, expected] of Object.entries(rules)) {
    assert.equal(
      severity(effective.rules[rule]),
      severity(expected),
      `${file}: ${rule}`,
    );
  }
}
test('JS recommended preset remains wired for scripts', async () => {
  await assertPreset('scripts/check.mjs', {
    ...js.configs.recommended.rules,
    ...prettier.rules,
    'no-unused-vars': 'off',
  });
});
test('TS recommended rules remain wired in each workspace', async () => {
  for (const file of [
    'apps/web/src/app/App.tsx',
    'apps/api/src/app.ts',
    'packages/contracts/src/index.ts',
  ]) {
    for (const preset of tseslint.configs.recommended) {
      await assertPreset(file, {
        ...preset.rules,
        '@typescript-eslint/no-unused-vars': 'off',
      });
    }
  }
});
test('every enabled React preset rule retains its severity', async () => {
  await assertPreset('apps/web/src/app/App.tsx', {
    ...reactHooks.configs.flat.recommended.rules,
    ...reactRefresh.configs.vite.rules,
  });
});
test('Prettier disables conflicting stylistic rules last', async () => {
  await assertPreset('apps/web/src/app/App.tsx', prettier.rules);
  assert.deepEqual(
    await ruleIds('app/check.ts', 'export const value = "double quotes"\n'),
    [],
  );
});
test('Node scripts and configs have Node globals and no browser/React/FSD rules', async () => {
  for (const file of [
    'scripts/check.mjs',
    'eslint.config.js',
    'apps/api/src/app.ts',
    'apps/web/vite.config.ts',
  ]) {
    const effective = await realEslint.calculateConfigForFile(
      path.join(repoRoot, file),
    );
    assert.equal(effective.languageOptions.globals.process, false, file);
    assert.equal(effective.languageOptions.globals.window, undefined, file);
    for (const rule of [
      'react-hooks/rules-of-hooks',
      'react-refresh/only-export-components',
      'boundaries/dependencies',
      'import-x/no-unresolved',
    ]) {
      assert.ok(!severity(effective.rules[rule]), `${file}: ${rule}`);
    }
  }
  const [result] = await eslint.lintText('process.cwd(); Buffer.from("ok");', {
    filePath: path.join(root, 'scripts/check.mjs'),
  });
  assert.deepEqual(result.messages, []);
});
test('config paths do not depend on running ESLint from the repository root', async () => {
  const fromWeb = new ESLint({ cwd: path.join(repoRoot, 'apps/web') });
  const [result] = await fromWeb.lintText(
    "export { queryClient } from '@/app/query/queryClient';",
    { filePath: 'src/app/init-auth.ts' },
  );
  assert.deepEqual(result.messages, []);
});
test('CLI --max-warnings 0 rejects warnings without lint errors', () => {
  const input =
    '/* eslint no-console: warn -- Testing the CLI warning limit. */\nconsole.log("example");';
  for (const [limit, expectedStatus] of [
    ['0', 1],
    ['1', 0],
  ]) {
    const result = spawnSync(
      process.execPath,
      [
        path.join(repoRoot, 'node_modules/eslint/bin/eslint.js'),
        '--stdin',
        '--stdin-filename',
        'scripts/check.mjs',
        '--format',
        'json',
        '--max-warnings',
        limit,
      ],
      { cwd: repoRoot, input, encoding: 'utf8' },
    );
    assert.ifError(result.error);
    assert.equal(result.status, expectedStatus, result.stderr);
    const [report] = JSON.parse(result.stdout);
    assert.equal(report.errorCount, 0);
    assert.equal(report.warningCount, 1);
  }
});
test('package scripts and lint-staged keep ESLint gates connected', async () => {
  const pkg = JSON.parse(
    await readFile(path.join(repoRoot, 'package.json'), 'utf8'),
  );
  assert.match(pkg.scripts.lint, /eslint \. --max-warnings 0/);
  assert.match(pkg.scripts['lint:fix'], /eslint \. --fix --max-warnings 0/);
  assert.match(
    pkg.scripts['test:lint'],
    /node --test scripts\/eslint-config\.test\.mjs/,
  );
  assert.match(pkg.scripts.test, /^npm run test:lint &&/);
  assert.match(pkg.scripts.validate, /^npm run lint &&/);
  assert.ok(pkg.scripts.validate.includes('npm test'));
  const stagedCommands = lintStaged['**/*.{js,jsx,mjs,cjs,ts,tsx}'];
  assert.match(
    stagedCommands[0],
    /node node_modules\/eslint\/bin\/eslint\.js --fix --max-warnings 0/,
  );
});

test('commit-msg hook retains staged and full-tree ESLint gates', async () => {
  const hook = await readFile(path.join(repoRoot, '.husky/commit-msg'), 'utf8');
  assert.match(
    hook,
    /if node node_modules\/lint-staged\/bin\/lint-staged\.js /,
  );
  assert.match(
    hook,
    /if node node_modules\/eslint\/bin\/eslint\.js \. --max-warnings 0; then/,
  );
  assert.match(hook, /else\s+status=1/);
  assert.match(hook, /exit "\$status"/);
});

test('async JSX handlers must explicitly handle or discard their Promise', async () => {
  for (const [code, shouldFail] of [
    ['export const form = <form onSubmit={async () => {}} />;', true],
    [
      'export const form = <form onSubmit={() => { void Promise.resolve(); }} />;',
      false,
    ],
  ]) {
    const [result] = await realEslint.lintText(code, {
      filePath: path.join(repoRoot, 'apps/web/src/app/App.tsx'),
    });
    assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
    assert.equal(
      result.messages.some(
        (message) =>
          message.ruleId === '@typescript-eslint/no-misused-promises',
      ),
      shouldFail,
      JSON.stringify(result.messages),
    );
  }
});

test('source files and tooling configs are not accidentally ignored', async () => {
  for (const file of [
    'eslint.config.js',
    'scripts/eslint-config.test.mjs',
    'apps/web/src/app/App.tsx',
    'apps/api/src/app.ts',
    'packages/contracts/src/index.ts',
  ]) {
    assert.equal(
      await realEslint.isPathIgnored(path.join(repoRoot, file)),
      false,
      file,
    );
  }
});

for (const layer of ['entities', 'features', 'widgets', 'pages']) {
  test(`${layer}: relative paths do not bypass slice isolation or public API`, async () => {
    assert.ok(
      (
        await ruleIds(
          `${layer}/alpha/check.ts`,
          "export { value } from '../beta';",
        )
      ).includes('boundaries/dependencies'),
    );
    assert.ok(
      (
        await ruleIds(
          'app/check.ts',
          `export { value } from '../${layer}/alpha/internal';`,
        )
      ).includes('boundaries/dependencies'),
    );
    assert.deepEqual(
      await ruleIds(
        `${layer}/alpha/check.ts`,
        `export { value } from '@/${layer}/alpha/internal';`,
      ),
      [],
    );
    assert.deepEqual(
      await ruleIds(
        'app/check.ts',
        `export const load = () => import('@/${layer}/alpha');`,
      ),
      [],
    );
  });
}
