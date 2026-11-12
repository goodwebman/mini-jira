import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import react from '@eslint-react/eslint-plugin';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import boundaries from 'eslint-plugin-boundaries';
import compat from 'eslint-plugin-compat';
import importX from 'eslint-plugin-import-x';
import perfectionist from 'eslint-plugin-perfectionist';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import effects from 'eslint-plugin-react-you-might-not-need-an-effect';
import sonarjs from 'eslint-plugin-sonarjs';
import tailwindcss from 'eslint-plugin-tailwindcss';
import unicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const layers = ['shared', 'entities', 'features', 'widgets', 'pages', 'app'];
const sliceLayers = layers.slice(1, -1);
const { browserslist: browserTargets } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    '**/.vitest/**',
    '**/.vercel/**',
    '**/node_modules/**',
  ]),
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    extends: [js.configs.recommended],
    plugins: {
      'eslint-comments': eslintComments,
      sonarjs,
      unicorn,
      perfectionist,
      'unused-imports': unusedImports,
    },
    rules: {
      'no-nested-ternary': 'error',
      'default-case-last': 'error',
      'no-else-return': 'error',
      'no-implicit-coercion': 'error',
      'no-param-reassign': 'error',
      'no-unreachable-loop': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'eslint-comments/require-description': 'error',
      'eslint-comments/no-unlimited-disable': 'error',
      'eslint-comments/no-duplicate-disable': 'error',
      'unused-imports/no-unused-imports': 'error',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-vars': 'error',
      'sonarjs/no-collapsible-if': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-nested-template-literals': 'error',
      'sonarjs/prefer-immediate-return': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/no-zero-fractions': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-logical-operator-over-ternary': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-structured-clone': 'error',
      'unicorn/prefer-top-level-await': 'error',
      'perfectionist/sort-enums': ['error', { order: 'asc', type: 'natural' }],
      'perfectionist/sort-union-types': [
        'error',
        { order: 'asc', type: 'natural' },
      ],
    },
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    ignores: ['apps/web/src/**'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  {
    files: [
      'apps/web/src/**/*.{ts,tsx}',
      'apps/api/{src,test}/**/*.ts',
      'packages/contracts/{src,test}/**/*.ts',
      'packages/monitoring/{src,test}/**/*.ts',
    ],
    languageOptions: {
      parserOptions: {
        project: [
          './apps/web/tsconfig.app.json',
          './apps/api/tsconfig.json',
          './packages/contracts/tsconfig.json',
          './packages/monitoring/tsconfig.json',
        ],
        tsconfigRootDir: repoRoot,
      },
    },
    rules: {
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    files: ['apps/web/src/**/*.{js,jsx,ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      boundaries,
      'import-x': importX,
      '@eslint-react': react,
      tailwindcss,
    },
    settings: {
      ...importX.flatConfigs.typescript.settings,
      'import/resolver': {
        typescript: {
          project: path.join(repoRoot, 'apps/web/tsconfig.app.json'),
        },
      },
      'import-x/resolver': {
        typescript: {
          project: path.join(repoRoot, 'apps/web/tsconfig.app.json'),
        },
      },
      'boundaries/root-path': repoRoot,
      tailwindcss: {
        cssConfigPath: path.join(
          repoRoot,
          'apps/web/src/shared/styles/index.css',
        ),
        functions: ['cn', 'clsx', 'cva'],
      },
      'boundaries/include': ['apps/web/src/**'],
      'boundaries/elements': [
        ...sliceLayers.map((layer) => ({
          type: layer,
          pattern: `apps/web/src/${layer}/*`,
          capture: ['slice'],
        })),
        ...['shared', 'app'].map((layer) => ({
          type: layer,
          pattern: `apps/web/src/${layer}`,
        })),
      ],
      'boundaries/files': [
        { pattern: 'apps/web/src/main.tsx', category: 'bootstrap' },
        { pattern: '**/*.css', category: 'styles' },
        { pattern: '**/*.d.ts', category: 'declaration' },
      ],
    },
    rules: {
      'import-x/no-unresolved': ['error', { ignore: ['\\?raw$'] }],
      'import-x/no-cycle': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'error',
      '@eslint-react/no-array-index-key': 'error',
      '@eslint-react/no-missing-key': 'error',
      '@eslint-react/no-duplicate-key': 'error',
      '@eslint-react/no-nested-component-definitions': 'error',
      '@eslint-react/no-unstable-context-value': 'error',
      '@eslint-react/no-unstable-default-props': 'error',
      '@eslint-react/jsx-no-useless-fragment': [
        'error',
        { allowExpressions: true },
      ],
      '@eslint-react/dom-no-dangerously-set-innerhtml': 'error',
      'tailwindcss/enforces-shorthand': 'error',
      'tailwindcss/no-contradicting-classname': 'error',
      'boundaries/no-unknown-files': 'error',
      'boundaries/no-unknown-dependencies': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            'FSD: imports must point to lower layers; sibling slices are isolated.',
          policies: [
            ...layers.map((layer, index) => ({
              from: { element: { type: layer } },
              allow: {
                to: { element: { type: layers.slice(0, index) } },
              },
            })),
            {
              from: { file: { categories: 'bootstrap' } },
              allow: {
                to: [
                  { element: { type: 'app' } },
                  { file: { path: 'apps/web/src/index.css' } },
                ],
              },
            },
            // A valid layer dependency must also go through the slice's public API.
            {
              to: { element: { type: sliceLayers } },
              disallow: {
                to: { element: { fileInternalPath: '!index.{ts,tsx,js,jsx}' } },
              },
              message: 'FSD: import another slice through its public index.ts.',
            },
            {
              from: {
                element: { type: 'app' },
                file: { path: '**/*.{test,spec}.{ts,tsx}' },
              },
              to: {
                element: { type: 'entities', captured: { slice: 'auth' } },
              },
              allow: { to: { element: { fileInternalPath: 'testing.ts' } } },
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'apps/*/src/**/*.{js,jsx,ts,tsx}',
      'packages/*/src/**/*.{js,jsx,ts,tsx}',
    ],
    ignores: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    rules: {
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
    },
  },
  {
    files: ['apps/web/src/**/*.{js,jsx,ts,tsx}'],
    ignores: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    plugins: { compat, 'react-you-might-not-need-an-effect': effects },
    settings: {
      browsers: browserTargets,
      // Vite transforms syntax but does not polyfill runtime JavaScript APIs.
      lintAllEsApis: true,
    },
    rules: {
      'compat/compat': 'error',
      ...Object.fromEntries(
        Object.keys(effects.rules).map((rule) => [
          `react-you-might-not-need-an-effect/${rule}`,
          'error',
        ]),
      ),
    },
  },
  {
    // Ядро авторизации переносится между проектами как есть: без фреймворков и кода приложения.
    // Браузер доступен только через AuthPlatform, поэтому токену некуда случайно уехать.
    files: ['apps/web/src/entities/auth/lib/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '^(react(-dom)?|axios)(/|$)|^@(tanstack|reduxjs|gwmt)/|^@/|/(model|api)(/|$)',
              message:
                'Ядро авторизации не зависит от фреймворков и кода приложения.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'navigator',
          'location',
          'localStorage',
          'sessionStorage',
        ].map((name) => ({
          name,
          message: 'Браузерные API доступны только через AuthPlatform.',
        })),
      ],
    },
  },
  prettier,
]);
