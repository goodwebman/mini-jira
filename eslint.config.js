import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    '**/.vitest/**',
    '**/.vercel/**',
    '**/node_modules/**',
  ]),
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
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
