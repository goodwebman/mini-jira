# Vite: development и production

Конфигурация: [apps/web/vite.config.ts](../apps/web/vite.config.ts).
Рядом с параметрами оставлены подробные комментарии о значениях и альтернативах.
Стек: Vite 8 / Rolldown / Oxc, React Compiler, Tailwind 4 / Lightning CSS.
Рекомендуемый Node.js — 24 LTS; минимум для Vite — 22.12.

## Команды из корня репозитория

| Команда                 | Результат                                                               |
| ----------------------- | ----------------------------------------------------------------------- |
| `npm ci`                | Установка версий из закоммиченного package-lock.json                    |
| `npm run dev`           | Сборка общих workspace-пакетов, затем API и frontend с HMR              |
| `npm run dev:web`       | Только Vite на localhost:5173; общие пакеты должны быть собраны         |
| `npm run build`         | Общие пакеты → TypeScript → production-сборка в apps/web/dist           |
| `npm run build:dev`     | Общие пакеты → TypeScript → сборка с development env, без Sentry upload |
| `npm run build:analyze` | Production-сборка без Sentry upload + apps/web/reports/bundle.html      |
| `npm run preview:web`   | Локальный просмотр последнего dist на localhost:4173                    |
| `npm run validate`      | ESLint, форматирование, типы, все тесты и production build              |

`dev` — сервер разработки с Fast Refresh, исходными модулями и диагностикой.
`build:dev` — статический оптимизированный артефакт с `.env.development*`.
У `vite build --mode development` всё ещё `NODE_ENV=production`, React production
runtime, минификация и `import.meta.env.PROD=true`: mode выбирает env-файлы,
а не автоматически переключает React на development runtime.
Для обычной разработки используйте `dev`, для воспроизведения build-проблем
на локальном API — `build:dev`. Оба варианта build пишут в один `dist`:
последняя команда заменяет предыдущую сборку.

`preview` использует уже собранный JS: изменение env перед запуском preview
не меняет встроенные настройки. Его API proxy наследуется от Vite server;
preview читает production env по умолчанию. Если `build:dev` использовал другой
`API_PROXY_TARGET`, запускайте `npm run preview:web -- --mode development`.

## Env без смешивания сред

Vite ищет файлы **в apps/web**, а не в корне монорепозитория.
Файлы `*.example` — только шаблоны, сами не загружаются.

Первоначальная настройка в PowerShell:

```powershell
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item apps/web/.env.development.example apps/web/.env.development.local
# Необязательно: локальная production-проверка с собственными значениями.
Copy-Item apps/web/.env.production.example apps/web/.env.production.local
```

Заполните `VITE_AUTH_SALT` и проверьте версию в `.env`. Production-шаблон
намеренно содержит пустой `VITE_AUTH_SALT`: после копирования он переопределит
значение из общей `.env`, и сборка остановится, пока вы не зададите хеш
именно production API. Не перезаписывайте существующие env при повторной настройке.

Приоритет от меньшего к большему:

1. `.env` — общие значения.
2. `.env.local` — общие локальные переопределения.
3. `.env.[mode]` — значения среды.
4. `.env.[mode].local` — локальные значения среды.
5. Env процесса / CI / Vercel — наивысший приоритет.

`.env.local` тоже читается production-сборкой: production-значения следует
явно переопределять в mode-файле либо CI. Все реальные env игнорируются Git;
в репозитории хранятся только примеры. После изменения env перезапустите dev,
для опубликованного сайта выполните новую сборку и deployment.

| Переменная                                          | Значения и назначение                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_API_URL`                                      | `/api/v1` для same-origin; `https://api.example.com/api/v1` для отдельного API. Во втором случае настройте CORS/cookies на API |
| `API_PROXY_TARGET`                                  | `http://localhost:3000` по умолчанию; только локальные dev/preview proxy, не production routing                                |
| `VITE_APP_VERSION`                                  | Непустая версия подписи авторизации, например `1.0.0`; должна соответствовать хешу                                             |
| `VITE_AUTH_SALT`                                    | SHA256(SALT_SECRET + VITE_APP_VERSION), 64 hex-символа; публичное значение, исходный SALT_SECRET остаётся на API               |
| `VITE_SENTRY_DSN`                                   | Публичный DSN frontend; пусто отключает мониторинг                                                                             |
| `VITE_SENTRY_ENABLED`                               | Строки `true` / `false`; включает SDK в dev. Production SDK включается при наличии DSN независимо от этого флага               |
| `VITE_SENTRY_ENVIRONMENT`                           | Явная метка, иначе VERCEL_ENV, иначе mode                                                                                      |
| `SENTRY_RELEASE`                                    | Идентификатор релиза, иначе VERCEL_GIT_COMMIT_SHA. Vite внедряет его в публичный VITE_SENTRY_RELEASE                           |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Только процесс сборки; нужны для upload source maps                                                                            |
| `BUILD_SENTRY_UPLOAD`                               | `true` по умолчанию; `false` запрещает upload. Development mode и анализ отключают upload независимо от флага                  |
| `BUILD_ANALYZE`                                     | Только точная строка `true` включает отчёт; команда build:analyze выставляет её сама                                           |

Env в браузере — строки: `Boolean('false')` возвращает `true`, поэтому флаги
сравниваются с `'true'`. Все `VITE_*` публичны; пароль, private API key и
SENTRY_AUTH_TOKEN нельзя называть с этим префиксом. `loadEnv` читает build-only
переменные для конфига, но в клиент пропускается только префикс `VITE_` и две
явные публичные метки Sentry. Не передавайте весь `process.env` через `define`.

До build проверяются API URL, версия (1–64 символа: латиница, цифры, `_ . + -`)
и lowercase-формат auth-хеша, как в API. Неверные credentials,
query/hash и protocol-relative API URL отклоняются. Dev-сервер остаётся доступен
без auth-настроек для работы над UI; вход требует заполненных значений.
Проверка формата хеша не доказывает, что он вычислен из нужного SALT_SECRET.

Не задавайте `NODE_ENV=development` в production CI. Для отдельной staging среды
можно использовать `npm run build -w mini-jira -- --mode staging` после сборки
общих пакетов и создать `.env.staging.local`; обычный build остаётся production.

## Что делает production-сборка

| Настройка                               | Выбор и альтернативы                                                                                                                                      |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser targets                         | Корневой browserslist: Chrome/Edge 111+, Firefox 114+, Safari/iOS 16.4+. Общая цель для Vite и ESLint compat; `esnext` допустим при более узкой поддержке |
| `minify: 'oxc'`                         | Встроенный JS-минификатор Vite 8. `false` — читаемый output; `terser` — отдельная зависимость и сравнение результата на проекте                           |
| `cssMinify: 'lightningcss'`             | Встроенная минификация CSS. `false` отключает; `esbuild` требует установки esbuild                                                                        |
| `cssCodeSplit: true`                    | CSS асинхронных частей загружается вместе с ними; `false` объединяет весь CSS                                                                             |
| `assetsInlineLimit: 4096`               | Малые импортированные assets встраиваются, остальные получают отдельный файл; `0` отключает inline                                                        |
| `modulePreload.polyfill: true`          | Сохраняет preload на поддерживаемых браузерах; Vite вычисляет зависимости ленивых импортов                                                                |
| `codeSplitting.groups`                  | Отдельные React, Router, Query и Sentry; остальные общие модули и lazy routes делит Rolldown                                                              |
| `includeDependenciesRecursively: false` | Группа захватывает совпавшие модули, а не всё дерево зависимостей. Предотвращает перетягивание React между библиотечными группами                         |
| `strictExecutionOrder: true`            | Сохраняет порядок side effects при разделении; немного увеличивает runtime. Особенно важно для раннего monitoring init                                    |
| `entriesAware: true` у Sentry           | Сохраняет различие реально используемых зависимостей initial/lazy imports SDK                                                                             |
| Имена с `[hash]`                        | Меняются вместе с содержимым; подходят для долгого кеша CDN. Ссылки между чанками тоже могут менять хеш при обновлении                                    |
| `chunkSizeWarningLimit: 500`            | Предупреждение на отдельный minified JS chunk больше 500 kB до сжатия; это не автоматический провал CI и не общий бюджет загрузки                         |
| `reportCompressedSize`                  | gzip-статистика только при анализе; обычная сборка быстрее. Реального HTTP-сжатия эта опция не включает                                                   |

Это закреплённые проектные решения, часть совпадает с defaults Vite 8 намеренно:
их видно при ревью и можно осознанно поменять. Конфиг использует актуальный
`build.rolldownOptions`, а не устаревшие `rollupOptions` / `manualChunks`.

Chunk splitting улучшает гранулярность кеша, но не удаляет загружаемый код.
React/Router/Query/Sentry, используемые при старте, всё равно загружаются при
старте. Новые тяжёлые страницы подключайте через существующие route `lazy`
и `import()`. Не создавайте один chunk на каждый пакет и не объединяйте все
node_modules в общий vendor: это ухудшает баланс запросов и кеширования.
Если ручные группы больше не помогают, альтернатива — `codeSplitting: true`
с автоматическим разделением и новым измерением.

`target` транспилирует синтаксис, но не добавляет polyfills для Intl, fetch
или других Web API. Tailwind 4 также задаёт минимальную поддержку браузеров.
Для старых браузеров одного `@vitejs/plugin-legacy` может быть недостаточно:
потребуется пересмотр CSS и используемых API.

React Compiler применяется одинаково в dev/build. Tree shaking учитывает
существующий `sideEffects` в package.json frontend: CSS и startup-модули
помечены как побочные эффекты. Не ставьте глобальное `sideEffects: false` или
`treeshake.moduleSideEffects: false`: это может удалить стили и инициализацию.
Глобальное удаление console/error тоже не включено: диагностика и побочные
эффекты аргументов должны сохраняться.

## Source maps и анализ

Без upload credentials `.map` не создаются. При наличии токена production
генерирует `hidden` maps, загружает их в Sentry и удаляет после upload.
Ошибка загрузки прерывает build. `hidden` скрывает только sourceMappingURL,
а не доступ к файлу: перед deployment не должно оставаться `.map` в dist.
Подробности — [Sentry](sentry.md).

Локальная production-проверка без отправки release/maps:

```powershell
$env:BUILD_SENTRY_UPLOAD = 'false'
npm run build
Remove-Item Env:BUILD_SENTRY_UPLOAD
npm run preview:web
```

Альтернатива — `BUILD_SENTRY_UPLOAD=false` в `.env.production.local`.
`build:dev` и `build:analyze` не загружают maps даже при сохранённом токене.

`rollup-plugin-visualizer` — единственная добавленная dev-зависимость:
показывает модули, зависимости и оценку размеров gzip/Brotli. Он не попадает
в runtime. Node-скрипт анализа выставляет флаги одинаково на Windows/Linux,
поэтому отдельный cross-env не нужен. Отчёт `apps/web/reports/bundle.html`
находится вне deploy-каталога и игнорируется Git, ESLint и Prettier.

В treemap ищите тяжёлые пакеты, дубли и зависимости, случайно попавшие на старт.
`gzipSize`/`brotliSize` по отдельным модулям — оценка, не точный размер HTTP
всего chunk. Для итогового трафика смотрите колонку gzip сборки и браузерную
вкладку Network с отключённым кешем. При необходимости у visualizer есть
`sunburst` и `network` вместо `treemap`.

## Dev и монорепозиторий

Порты фиксированы: dev 5173, preview 4173. `strictPort:true` завершает запуск,
если порт занят: OAuth callback и APP_URL не должны неожиданно сменить origin.
Если меняете порт через CLI, синхронизируйте APP_URL на API и OAuth providers.

`resolve.dedupe` оставляет одну копию React/React DOM во workspace.
`optimizeDeps.include` заранее собирает React runtime, Query и Router для dev;
автоматический поиск остальных зависимостей остаётся включён. Это не влияет
на production chunks. Не задавайте `force:true` постоянно: потеряете кеш.
Для разового сброса: `npm run dev:web -- --force`.

`server.warmup` прогревает main.tsx. Watch polling не включён: он расходует CPU;
для WSL/Docker включайте только если обычные filesystem events не доходят.
Общие workspace-пакеты собираются перед `npm run dev`; для живого редактирования
contracts параллельно запустите существующий `npm run dev:contracts`.

Proxy сохраняет `/api` путь и Host, проверяет TLS и не добавляет короткого
timeout для SSE. `changeOrigin:true` нужен для upstream, выбирающего virtual
host; он не решает CORS production API. `ws:true` здесь не нужен: realtime — SSE.
Сетевой доступ включается осознанно через `--host 0.0.0.0`; для tunnel добавляйте
конкретное имя в allowedHosts. CORS/allowedHosts не открыты для всех сайтов.

## Production-хостинг и высокая нагрузка

Vite создаёт статические файлы. Параллельные пользователи, TLS, HTTP/2/3,
сжатие и HTTP cache обслуживаются CDN/HTTP-сервером. В текущем проекте это
Vercel Services; локальные server/preview настройки туда не переносятся.
Деплой описан в [vercel-services.md](vercel-services.md).

Для собственного хостинга применяйте разные правила:

| Ответ                         | Cache-Control и маршрутизация                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `/assets/*` с хешем, HTTP 200 | `public, max-age=31536000, immutable`                                                              |
| `/index.html` и SPA HTML      | `no-cache`: перед использованием проверять актуальность                                            |
| Файлы public без хеша         | Короткий cache lifetime либо revalidation; не immutable                                            |
| `/api/*`                      | Сначала направлять в API, до SPA fallback; пользовательские ответы не кешировать как public assets |
| Отсутствующий asset           | HTTP 404, без годового кеша; не подменять index.html                                               |

Включите Brotli/gzip на CDN с корректным `Vary: Accept-Encoding`. Предварительные
`.br/.gz` нужны только если ваш сервер умеет выбирать их по Accept-Encoding;
для Vercel отдельный compression plugin не нужен. Публикуйте атомарно и сохраняйте
старые assets на период жизни открытых вкладок. Иначе старый lazy import после
deployment получит 404; существующая RouteErrorBoundary позволяет перезагрузить
страницу. Локальный emptyOutDir очищает только новую папку сборки и не заменяет
политику хранения предыдущих deployments.

Service worker/PWA и принудительный auto-reload не добавлены: они требуют
отдельной политики обновления и сохранения пользовательского ввода. Manifest
для server-rendered HTML тоже не нужен: здесь HTML генерирует Vite.

Проверки перед deployment: `npm ci`, настроенные env, `npm run validate`,
просмотр bundle report при росте зависимостей, smoke-проверка авторизации,
прямого открытия вложенного URL и SSE в preview deployment. Первая облачная
проверка также должна подтвердить реальные Cache-Control, Content-Encoding,
отсутствие .map и загрузку lazy chunks между двумя релизами. Конфиг сам по себе
не доказывает производительность под нагрузкой: для этого нужны замеры CDN,
браузера и API с репрезентативным трафиком.

## Первоисточники

- [Vite build options](https://vite.dev/config/build-options): минификация, maps, CSS, assets.
- [Vite env and mode](https://vite.dev/guide/env-and-mode): приоритеты env и отличие mode от NODE_ENV.
- [Vite server options](https://vite.dev/config/server-options): proxy, порты, warmup и ограничения доступа.
- [Vite dependency optimization](https://vite.dev/config/dep-optimization-options): pre-bundling только для dev.
- [Rolldown code splitting](https://rolldown.rs/reference/OutputOptions.codeSplitting): группы и порядок выполнения.
- [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer): отчёты и оценки сжатия.
