import babel from '@rolldown/plugin-babel';
import { sentryVitePlugin } from '@sentry/bundler-plugins/vite';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

import { sentryBuildOptions } from './sentry-build.ts';

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const root = fileURLToPath(new URL('.', import.meta.url));
  const env = loadEnv(mode, root, '');
  const outDir = fileURLToPath(new URL('./dist', import.meta.url)).replaceAll(
    '\\',
    '/',
  );
  const upload = command === 'build' ? sentryBuildOptions(env, outDir) : null;
  return {
    define: {
      'import.meta.env.VITE_SENTRY_ENVIRONMENT': JSON.stringify(
        env.VITE_SENTRY_ENVIRONMENT || env.VERCEL_ENV || mode,
      ),
      'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(
        env.SENTRY_RELEASE || env.VERCEL_GIT_COMMIT_SHA || '',
      ),
    },
    build: {
      sourcemap: upload ? 'hidden' : false,
      target: browserslistToEsbuild(undefined, {
        path: fileURLToPath(new URL('../..', import.meta.url)),
      }),
    },
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      ...(upload ? [sentryVitePlugin(upload)] : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': env.API_PROXY_TARGET || 'http://localhost:3000',
      },
    },
  };
});
