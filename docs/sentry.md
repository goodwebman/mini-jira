# Sentry: подключение, проверка и перенос

Практический разбор ошибок, запросов и стектрейсов:
[Как читать ошибки mini-jira в Sentry](sentry-errors.md).

В проект подключены Sentry React и Node SDK **v11**. Общее ядро —
`packages/monitoring`; конфигурация приложения — `apps/web/src/app/monitoring.ts`
и `apps/api/src/lib/monitoring.ts`. Без DSN SDK не инициализируется.

## Бесплатное подключение

1. Зарегистрируйтесь на [sentry.io](https://sentry.io/signup/) и выберите
   **Developer / Free**. На 12 ноября 2026 года это один пользователь,
   неограниченное число проектов, 5 000 ошибок и история за 30 дней.
   Актуальные ограничения: [официальные тарифы](https://sentry.io/pricing/).
   Для этой настройки платный план и платные дополнения не нужны.
2. Создайте два проекта: React (`mini-jira-web`) и Node.js (`mini-jira-api`).
   Скопируйте каждый DSN из **Project Settings → Client Keys (DSN)**.
3. В `apps/web/.env` добавьте:

   ```dotenv
   VITE_SENTRY_DSN=https://PUBLIC_KEY@YOUR_INGEST_HOST/WEB_PROJECT_ID
   VITE_SENTRY_ENABLED=true
   ```

4. В `apps/api/.env` добавьте:

   ```dotenv
   SENTRY_DSN=https://PUBLIC_KEY@YOUR_INGEST_HOST/API_PROJECT_ID
   SENTRY_ENABLED=true
   ```

5. Из корня запустите `npm install`, затем `npm run dev`.
   `*_ENABLED=true` нужен для локальной проверки. В production наличие DSN
   включает мониторинг автоматически. Чтобы выключить его, уберите DSN.
6. На Vercel задайте `VITE_SENTRY_DSN` и `SENTRY_DSN` в едином проекте
   **mini-jira** с сервисами web/api, затем выполните redeploy. Настройки Vite
   встраиваются при сборке. Локальные `.env` не коммитятся.
   Первый деплой: [vercel-services.md](vercel-services.md).

DSN содержит публичный ключ отправки и может присутствовать в браузере.
`SENTRY_AUTH_TOKEN` — секрет загрузки артефактов, ему нельзя давать префикс
`VITE_`. В клиентскую сборку передаются только DSN, environment и release.

В этой конфигурации Replay, tracing, profiling не подключены; логи и метрики
отбрасываются `beforeSendLog` / `beforeSendMetric`. События ошибок отправляются
без случайного sampling, ожидаемые обработанные ошибки фильтруются. Квота
Sentry всё равно действует: после исчерпания события могут отбрасываться.
Не подключайте платные дополнения и оплату дополнительных событий, если
хотите остаться на бесплатном плане. Создайте email alert на новые issues.

## Читаемые стектрейсы в production

Для frontend source maps создайте токен загрузки по
[инструкции Sentry](https://docs.sentry.io/platforms/javascript/guides/react/sourcemaps/uploading/vite/).
Предпочтителен Organization Token для CI; для Personal Token официальная
инструкция указывает Project: Read & Write и Release: Admin.

В build environment единого проекта Vercel задайте:

```dotenv
SENTRY_AUTH_TOKEN=YOUR_SECRET_TOKEN
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=mini-jira-web
```

Для локальной production-сборки эти переменные можно положить в
`apps/web/.env.local`, затем выполнить из корня `npm run build`.

Плагин стоит последним в Vite, генерирует скрытые карты, загружает их
по debug ID и удаляет `.map` из `dist`. Без токена карты не генерируются.
Если токен задан, но не указаны org/project, сборка падает с понятной ошибкой.
Ошибки загрузки также не подавляются: не публикуйте неуспешную сборку.

Release берётся из `SENTRY_RELEASE` или `VERCEL_GIT_COMMIT_SHA`, одинаково
для runtime и upload; environment — из явной настройки или `VERCEL_ENV`.
Для другого CI задайте уникальный `SENTRY_RELEASE` (например, commit SHA)
в обоих приложениях. Версию соли `VITE_APP_VERSION` менять для Sentry не нужно.
Для preview можно задать отдельные DSN или оставить их пустыми, чтобы
предпросмотры не расходовали production-квоту.

Frontend source maps настроены автоматически. Для API Sentry получает
координаты Node-стека; загрузку backend-артефактов минифицированной сборки
Vercel эта интеграция не выполняет.

## Проверка своего подключения

1. После `npm run dev` откройте frontend и DevTools Console. Выполните:

   ```js
   const { monitoring } = await import('/src/app/monitoring.ts');
   monitoring.isEnabled(); // должно быть true
   monitoring.captureException(new Error('Sentry manual smoke test'));
   await monitoring.flush();
   ```

2. Найдите событие в Issues проекта web, проверьте environment и стек.
   ID, возвращённый `captureException`, ещё не гарантирует доставку:
   окончательная проверка — появление события в Sentry. Проверьте Network,
   если отправку блокирует расширение или CSP. Для CSP разрешите HTTPS ingest
   host вашего DSN в `connect-src`.
3. Для API из каталога `apps/api` выполните локальную диагностическую команду:

   ```bash
   npx tsx --env-file=.env -e "import('./src/instrument.ts').then(async () => { const { monitoring } = await import('./src/lib/monitoring.ts'); console.log('enabled:', monitoring.isEnabled()); monitoring.captureException(new Error('Sentry API manual smoke test')); console.log('flushed:', await monitoring.flush()); })"
   ```

   Событие должно появиться в проекте api. Не требуется ломать базу или
   добавлять публичный endpoint, вызывающий ошибку.

4. После production deploy воспроизведите известную тестовую ошибку на
   staging. Убедитесь, что frontend-стек раскрывается в исходный TypeScript,
   а `.map` отсутствуют среди опубликованных файлов. Подписанный auth flow
   и данные пользователей для smoke test не нужны.

Реальные ingest, upload и Vercel cold start требуют ваших DSN, токена и
деплоя. Автоматические тесты используют настоящие SDK и транспорт в памяти,
без запросов в Sentry.

## Что собирается

| Источник                                        | Поведение                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| Необработанные JS ошибки и Promise rejection    | Глобальные обработчики браузера / Node                                    |
| Ошибка React rendering                          | Существующий ErrorBoundary + `source=react`, UI fallback сохраняется      |
| Query / mutation                                | Одно событие после последней попытки, `source=query` / `mutation`         |
| API unexpected failure и AppError 500           | `source=api`, requestId, HTTP method, шаблон маршрута, внутренний user ID |
| HTTP 4xx, отмена и смена сессии                 | Обработанные ошибки не отправляются                                       |
| Необработанная ошибка с ожидаемым HTTP статусом | Сохраняется: необработанный сбой требует внимания                         |
| Авторизация                                     | Только внутренний user ID и тип события; logout/kick очищает identity     |

Query keys, mutation variables и тело HTTP-ответа не добавляются в события.
API передаёт user/context отдельно в каждый `captureException`, без глобального
`setUser`: параллельные запросы не меняют чужую identity. На пути ошибки API
ожидает `flush(2000)` перед ответом, чтобы serverless не заморозил отправку;
это может добавить до двух секунд к ответу 500. Успешные запросы не ждут Sentry.

SDK v11 явно запрещён автоматический сбор userInfo, cookies, HTTP headers,
HTTP bodies, URL queries, SQL parameters и frame variables. `beforeSend`
дополнительно очищает event, URL, email и известные формы секретов в тексте,
удаляет attachments, исходный код в stack frames и произвольные thread data.
От Drizzle не отправляется обёртка с SQL и параметрами. Debug IDs и координаты
стека сохраняются для source maps и группировки.

Это не универсальный детектор персональных данных в произвольном тексте:
не передавайте пользовательский контент в error messages, tags, contexts и
fingerprints. User ID остаётся псевдонимным идентификатором. Включите также
server-side Data Scrubbing в Sentry. Sanitizer ограничивает глубину, число
элементов и длину строк, поддерживает циклы и не вызывает getters в contexts.

## Перенос в другой проект

Скопируйте `packages/monitoring` целиком в npm workspace. В `src` нет
импортов приложения, React, Hono, auth, Vite или браузерных глобальных API.
Из Sentry используются только типы, конкретный runtime SDK внедряется снаружи.
В обычном приложении можно скопировать только `src` и установить
`@sentry/core@^11.12.0` вместе с SDK своей платформы той же версии.

Пример Node-приложения:

```ts
import { createMonitoring } from '@gwmt/monitoring';
import * as Sentry from '@sentry/node';

const monitoring = createMonitoring({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV || 'development',
  release: process.env.SENTRY_RELEASE,
  sdk: {
    init: (options) =>
      Sentry.init({
        ...options,
        defaultIntegrations: false,
        enableOpenTelemetrySetup: false,
        enableRuntimeChannelInjection: false,
        integrations: [
          Sentry.onUncaughtExceptionIntegration(),
          Sentry.onUnhandledRejectionIntegration({ mode: 'strict' }),
          Sentry.linkedErrorsIntegration(),
        ],
      }),
    isEnabled: Sentry.isEnabled,
    captureException: Sentry.captureException,
    setUser: Sentry.setUser,
    addBreadcrumb: Sentry.addBreadcrumb,
    flush: Sentry.flush,
  },
});

monitoring.init(); // один раз до импорта приложения
```

React-адаптер можно взять из `apps/web/src/app/monitoring.ts`.
`bind-monitoring.ts` — отдельная интеграция этого приложения с auth и
TanStack Query; переносить её нужно только при использовании этих механизмов.
Для Vue, Electron, Next или другого runtime подставьте соответствующий SDK
v11 и его платформенную инициализацию. Не переносите React-глобальный singleton
на сервер: server identity передавайте в контексте конкретного события.

API ядра: `init`, `isEnabled`, `captureException`, `setUser`, `addBreadcrumb`,
`flush`. Исключения SDK не ломают приложение. `flush` вызывается при завершении
серверной работы, а не после каждого действия браузера. Не вызывайте `close`
на каждом logout или React unmount: клиент живёт столько же, сколько приложение.
HMR сохраняет один клиент и снимает старые app-подписки; после изменения самой
конфигурации мониторинга перезагрузите страницу.

## Автоматические проверки

```bash
npm run test -w @gwmt/monitoring
npm run test -w mini-jira -- src/app/bind-monitoring.test.ts src/app/monitoring-transport.test.ts src/app/providers/AppProviders.test.tsx test/sentry-build.test.ts
npm run test -w @gwmt/api -- test/monitoring.test.ts test/monitoring-transport.test.ts test/vercel-entrypoint.test.ts
npm run validate
```

Тесты покрывают повторный init и сбои SDK, privacy/циклы/getters/prototype keys,
ожидаемые и необработанные ошибки, повторы запросов, отмену, отписки и смену
аккаунта, React fallback, параллельные API context, настоящий DrizzleQueryError,
serverless flush и политику source maps. Transport-тесты проверяют реальные
envelope обоих SDK, отсутствие attachments и сохранение stack frames.

Независимый агент проверил интеграцию и повторно просмотрел исправления.
Ревью помогло устранить утечку параметров Drizzle, JSON-секретов и attachments,
неверный порядок загрузки `.env` / раннего init и пропуск явного AppError 500.

`npm audit --omit=dev` не обнаружил уязвимостей production-зависимостей.
Полный `npm audit` сообщает о 17 moderate в существующих инструментах
ESLint / Prettier / Drizzle; их обновление не входит в интеграцию Sentry.
Vite также предупреждает об общем JS chunk около 668 kB (205 kB gzip).
Replay, BrowserTracing и Feedback в собранном коде отсутствуют; предупреждение
о размере bundle сохранено.
