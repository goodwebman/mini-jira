import babel from '@rolldown/plugin-babel';
import { sentryVitePlugin } from '@sentry/bundler-plugins/vite';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { fileURLToPath } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';

import { validateBuildEnv } from './build-env.ts';
import { sentryBuildOptions } from './sentry-build.ts';

/**
 * Vite 8: Rolldown собирает JS, Oxc минифицирует JS, Lightning CSS — CSS.
 * Параметры dev-сервера не управляют production-хостингом.
 * Режимы, команды, env и CDN: ../../docs/vite.md.
 */
export default defineConfig(({ mode, command }) => {
  // Абсолютный root делает пути независимыми от cwd: npm workspace / CI / Vitest.
  const root = fileURLToPath(new URL('.', import.meta.url));
  // Загружаем только используемые группы. Это env процесса сборки, не браузера.
  // Пустой префикс '' прочитал бы все env, включая ненужные серверные секреты.
  const env = loadEnv(mode, root, [
    'VITE_',
    'API_PROXY_',
    'SENTRY_',
    'VERCEL_',
    'BUILD_',
  ]);
  const isBuild = command === 'build';
  const analyze = isBuild && env.BUILD_ANALYZE === 'true';
  if (isBuild) validateBuildEnv(env);

  const outDir = fileURLToPath(new URL('./dist', import.meta.url)).replaceAll(
    '\\',
    '/',
  );
  // Локальная development-сборка и анализ не создают релизы в Sentry.
  // BUILD_SENTRY_UPLOAD=false — явное отключение для локальной production-проверки.
  const upload =
    isBuild &&
    mode !== 'development' &&
    !analyze &&
    env.BUILD_SENTRY_UPLOAD !== 'false'
      ? sentryBuildOptions(env, outDir)
      : null;

  return {
    root,
    envDir: root,
    // Только VITE_* доступны через import.meta.env; токены Sentry сюда не входят.
    // Нельзя ставить envPrefix: '' или define: { 'process.env': env }.
    envPrefix: 'VITE_',
    // Приложение и BrowserRouter развёрнуты в корне домена. Для /jira/ нужно
    // одновременно менять base, basename роутера и правила SPA на хостинге.
    base: '/',
    define: {
      'import.meta.env.VITE_SENTRY_ENVIRONMENT': JSON.stringify(
        env.VITE_SENTRY_ENVIRONMENT || env.VERCEL_ENV || mode,
      ),
      'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(
        env.SENTRY_RELEASE || env.VERCEL_GIT_COMMIT_SHA || '',
      ),
    },
    build: {
      outDir,
      // true очищает старые артефакты. Безопасно: outDir фиксирован внутри root.
      // false оставит мусор прошлых сборок; старые релизы хранит CDN, не dist.
      emptyOutDir: true,
      // false — без карт; true — отдельные .map с ссылкой из JS; inline — в JS.
      // hidden убирает ссылку, но НЕ закрывает .map от HTTP: Sentry удаляет
      // файлы только после успешной загрузки; ошибка upload прерывает сборку.
      sourcemap: upload ? 'hidden' : false,
      // Один browserslist в корневом package.json для Vite и ESLint compat.
      // 'esnext' меньше транспилирует, но сужает поддержку. target не добавляет
      // polyfills браузерных API; старым браузерам нужен отдельный legacy-план.
      target: browserslistToEsbuild(undefined, {
        path: fileURLToPath(new URL('../..', import.meta.url)),
      }),
      // Нативные минификаторы Vite 8. false удобно для ручного изучения bundle;
      // 'terser' требует пакет terser и отдельное измерение размера/времени.
      minify: 'oxc',
      cssMinify: 'lightningcss',
      // true загружает CSS ленивых страниц вместе с ними; false делает один CSS.
      cssCodeSplit: true,
      // До 4 KiB импортированный asset встраивается как data URL. 0 — всегда
      // отдельные файлы; большой лимит раздувает JS/CSS и ухудшает их кеширование.
      assetsInlineLimit: 4096,
      // Vite рассчитывает preload зависимостей import(), уменьшая waterfall.
      // polyfill:false допустим только после проверки всех целевых браузеров.
      modulePreload: { polyfill: true },
      // Это предупреждение о размере ОДНОГО minified JS chunk до gzip, не лимит
      // всего сайта. Рост не маскируем увеличением порога: смотрим build:analyze.
      chunkSizeWarningLimit: 500,
      // gzip-статистика полезна при анализе; обычная CI-сборка не тратит на неё CPU.
      // Это только отчёт: реальное gzip/Brotli-сжатие выполняет CDN/HTTP-сервер.
      reportCompressedSize: analyze,
      rolldownOptions: {
        output: {
          // Хеш содержимого позволяет CDN кешировать assets на год с immutable.
          // index.html и файлы public/ без хеша требуют другой Cache-Control.
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          // При ручном chunking сохраняем порядок инициализации side effects,
          // включая monitoring до приложения. Цена — небольшие runtime-обёртки.
          strictExecutionOrder: true,
          codeSplitting: {
            // Не втягиваем зависимости рекурсивно в первую совпавшую группу.
            // Иначе Sentry/Router могут забрать React в свой chunk.
            includeDependenciesRecursively: false,
            // Отдельный кеш для крупных библиотек; import() страниц по-прежнему
            // определяет lazy loading. Разделение не уменьшает общий размер JS.
            // Альтернатива — codeSplitting:true, полностью автоматический split.
            groups: [
              {
                name: 'react-vendor',
                test: /[\\/]node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
              },
              {
                name: 'router-vendor',
                test: /[\\/]node_modules[\\/]react-router[\\/]/,
              },
              {
                name: 'query-vendor',
                test: /[\\/]node_modules[\\/]@tanstack[\\/](?:react-query|query-core)[\\/]/,
              },
              {
                name: 'sentry-vendor',
                test: /[\\/]node_modules[\\/]@sentry[\\/]/,
                // Сохраняем различия между initial и lazy зависимостями SDK.
                // false объединит все совпадения в один загружаемый chunk.
                entriesAware: true,
              },
            ],
          },
        },
      },
    },
    plugins: [
      // Fast Refresh в dev, JSX transform в build.
      react(),
      // Автоматическая мемоизация React Compiler; один pipeline в dev и build.
      // Отключение меняет поведение оптимизаций, поэтому проверяем React-тесты.
      babel({ presets: [reactCompilerPreset()] }),
      // Официальная интеграция Tailwind 4. Второй PostCSS Tailwind plugin не нужен.
      tailwindcss(),
      // Только build с credentials; никогда не загружаем карты при dev/Vitest.
      ...(upload ? [sentryVitePlugin(upload)] : []),
      // Отчёт вне dist: пути модулей не публикуются вместе с приложением.
      // template: 'treemap' | 'sunburst' | 'network'; open:false подходит для CI.
      ...(analyze
        ? [
            visualizer({
              filename: fileURLToPath(
                new URL('./reports/bundle.html', import.meta.url),
              ),
              template: 'treemap',
              gzipSize: true,
              brotliSize: true,
              open: false,
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      // В workspace React должен быть одним singleton: две копии ломают hooks.
      // preserveSymlinks:true этому мешает, оставляем стандартное false.
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      // Только dev pre-bundling, не production chunking. Явно прогреваем runtime
      // и основные библиотеки; discovery остальных зависимостей остаётся включён.
      include: [
        'react',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@tanstack/react-query',
        'react-router',
      ],
    },
    server: {
      host: 'localhost',
      port: 5173,
      // false незаметно выберет другой порт и сломает APP_URL / OAuth callback.
      strictPort: true,
      // CORS/allowedHosts оставляем защищёнными defaults Vite. Для LAN —
      // --host 0.0.0.0; для tunnel — конкретный allowedHosts, не true.
      warmup: { clientFiles: ['./src/main.tsx'] },
      proxy: {
        // Точное начало пути: /api и /api/...; /apiary не должно идти в API.
        '^/api(?:/|$)': {
          target: env.API_PROXY_TARGET || 'http://localhost:3000',
          // Сохраняем Host как раньше: same-origin cookies/OAuth, без rewrite.
          // true нужен некоторым внешним API с virtual-host routing.
          changeOrigin: false,
          // TLS проверяется. secure:false допускается лишь для локальных cert.
          secure: true,
          // API держит SSE-соединения: короткий proxyTimeout оборвёт realtime.
          // WebSocket не используется; ws:true понадобится только при переходе.
        },
      },
    },
    preview: {
      host: 'localhost',
      port: 4173,
      strictPort: true,
      // Proxy наследуется от server: локальная проверка dist с тем же API.
      // preview не предназначен для production; там нужны CDN и API routing.
    },
  };
});
