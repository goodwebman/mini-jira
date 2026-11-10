# goodWebManTasks

Мини-Jira: канбан-доски, задачи, спринты и KPI. Монорепозиторий на npm workspaces.

| Папка | Что внутри |
|---|---|
| `apps/api` | Бэкенд: Hono, Drizzle, Neon. Деплоится на Vercel |
| `apps/web` | Фронтенд: React и Vite |
| `packages/contracts` | Общие zod-схемы, типы, подписи и правила доступа `permissions.ts`. Собирается в `dist` |

## Запуск

Нужен Node.js 22 или новее и база Neon.

```bash
npm install
cp apps/api/.env.example apps/api/.env   # заполните значения
cp apps/web/.env.example apps/web/.env   # задайте соль сборки
npm run db:migrate
npm run db:seed
npm run dev                             # фронтенд и бэкенд одной командой
```

Фронтенд: http://localhost:5173, API: http://localhost:3000/api/v1. Запросы `/api` проксируются на бэкенд. Команда сначала собирает contracts; `Ctrl+C` останавливает оба сервера. Для отдельного запуска доступны `npm run dev:api` и `npm run dev:web`.

После сида вход под любым аккаунтом с паролем `password`. Для проверки ролей на доске GWT:

| Email | Роль на GWT |
|---|---|
| `anna@example.com` | Администратор |
| `dmitry@example.com` | Рабочий |
| `viktoria@example.com` | Гость |

Сид идемпотентен и отказывается работать при `NODE_ENV=production`.

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | Собирает contracts и запускает фронтенд и бэкенд вместе |
| `npm test` | Собирает contracts и запускает все тесты. Сеть и Docker не нужны, база это PGlite |
| `npm run typecheck` | Проверка типов contracts и api |
| `npm run build` | Сборка contracts и фронта |
| `npm run db:generate` | Новая миграция по изменениям в `apps/api/src/db/schema.ts` |
| `npm run db:migrate` | Применяет миграции через `DATABASE_URL_UNPOOLED` |
| `npm run db:seed` | Заполняет базу данными прототипа |
| `npm run dev:contracts` | Пересобирает contracts при изменениях |
| `npm run docs` | Swagger UI без базы и `.env` |
| `npm run openapi` | Обновляет `docs/openapi.json` |

## Контракт API

Полное описание всех ручек: группы, поля, ограничения, коды ошибок, правила токенов и ролей.

| Как смотреть | Где |
|---|---|
| Swagger без базы и `.env` | `npm run docs`, затем http://localhost:3001/api/v1/docs |
| Swagger на запущенном API | http://localhost:5173/api/v1/docs или `https://<web>/api/v1/docs` |
| Файл OpenAPI 3.1 | [docs/openapi.json](docs/openapi.json) |
| Тот же JSON с сервера | `GET /api/v1/openapi.json` |

В режиме `npm run docs` базы нет, поэтому «Try it out» работает только на запущенном API: выполните `POST /auth/login`, скопируйте `accessToken` и вставьте его в Authorize.

Поля и ограничения собираются из тех же zod-схем, что проверяют запросы. После изменения схем или ручек обновите файл командой `npm run openapi`: если забыть, упадёт тест.

### Подпись входа и регистрации

`POST /auth/login` и `POST /auth/register` принимаются только с заголовками `fastify-version`, `fastify-timestamp` и `fastify-token`, иначе `403 SALT_INVALID`:

- соль сборки: `salt = SHA256(SALT_SECRET + version)`, в клиент попадает только этот хэш;
- подпись: `fastify-token = SHA256(salt + email + timestamp)`, где `email` ровно как в теле запроса;
- `timestamp` может расходиться с сервером не больше чем на 5 минут.

Формат совпадает с `createSalt` и `createSaltHeaders` из `@deamondsear/core`. Заголовки для ручной проверки в Swagger или curl: `npm run salt -- anna@example.com`.

Это защита от простых скриптов, а не секрет: соль лежит в бандле клиента. Хранение паролей от неё не зависит, там scrypt со своей солью на каждый пароль.

### Подключение на фронте

Типы, схемы форм, подписи и правила доступа лежат в `@gwmt/contracts`. Добавьте в `apps/web/package.json` зависимость `"@gwmt/contracts": "*"`, выполните `npm install`, и они доступны напрямую:

```ts
import {
  allowedStatuses,
  createTaskBodySchema,
  TASK_STATUS_LABELS,
  type TaskCard,
} from '@gwmt/contracts';
```

Перед запуском фронта contracts должен быть собран: `npm run build:contracts`, а для пересборки при изменениях `npm run dev:contracts`. Сборка на Vercel уже настроена так, что contracts собирается первым.

Если нужен сгенерированный клиент, файл подходит для генераторов, и у каждой ручки есть `operationId`:

```bash
npx openapi-typescript docs/openapi.json -o apps/web/src/api/schema.d.ts
```

## Переменные окружения

Фронтенд читает `apps/web/.env` через `env` из `@/shared/config` — это единственная точка доступа к `import.meta.env`. `VITE_API_URL=/api/v1` использует локальный Vite proxy; для отдельного API задайте полный адрес с префиксом, например `https://api.example.com/api/v1`. `VITE_AUTH_SALT` и `VITE_APP_VERSION` задают подпись входа. После изменения `.env` перезапустите Vite; значения `VITE_*` попадают в браузерный бандл.

Запросы приложения идут через `apiClient` из `@/shared/api`: `apiClient.get<Me>('/me')`, `apiClient.post('/tasks', body)`. Клиент добавляет API URL, сериализует JSON, поддерживает FormData и бросает `ApiError` со статусом и телом ответа. При старте `app/init-auth.ts` подключает `authService.fetch`, который обновляет токен и повторяет запросы. Запросы входа, refresh и logout используют обычный fetch, чтобы refresh не ждал сам себя. Импорты между модулями используют `@/` (каталог `apps/web/src`); алиас работает в TypeScript, Vite и Vitest.

Список лежит в `apps/api/.env.example`. Бэкенд проверяет их при старте и не запустится с неверными значениями.

| Имя | Смысл |
|---|---|
| `DATABASE_URL` | Пулерное подключение Neon, им пользуется приложение |
| `DATABASE_URL_UNPOOLED` | Прямое подключение Neon, только для миграций и сида |
| `JWT_ACCESS_SECRET` | Минимум 32 байта |
| `SALT_SECRET` | Минимум 32 байта. Из него получается соль сборки клиента |
| `APP_URL` | Публичный origin фронта без слэша на конце. Локально `http://localhost:5173` |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | OAuth App на GitHub |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth-клиент Google |
| `NODE_ENV` | На Vercel выставляется сам |

## Деплой

Два проекта Vercel из одного репозитория:

| Проект | Root Directory |
|---|---|
| `gwmt-api` | `apps/api` |
| `gwmt-web` | `apps/web` |

1. Создайте проект Neon. Регион функций Vercel должен совпадать с регионом базы: по умолчанию у Vercel это `iad1`, для Франкфурта выберите `fra1` в настройках проекта.
2. Создайте оба проекта. В настройках Root Directory должна быть включена опция «Include files outside the root directory», иначе не соберётся `packages/contracts`.
3. Заполните переменные окружения в `gwmt-api`. `APP_URL` это домен `gwmt-web`.
4. Примените миграции локально с боевой строкой подключения: `npm run db:migrate`. При старте функции они не запускаются.
5. Если имя `gwmt-api.vercel.app` оказалось занято, поменяйте домен в `apps/web/vercel.json`.
6. Создайте OAuth App на GitHub с callback `https://<web>/api/v1/auth/github/callback`. Для локальной разработки нужен отдельный OAuth App с `http://localhost:5173/api/v1/auth/github/callback`.
7. Создайте в Google Cloud Console OAuth-клиент типа Web application. Добавьте Authorized redirect URI `https://<web>/api/v1/auth/google/callback` и для локальной разработки `http://localhost:5173/api/v1/auth/google/callback`, один клиент может держать оба. Пока приложение в статусе Testing, войти смогут только добавленные тестовые пользователи.

Браузер ходит только на домен web, а запросы к `/api` уходят на бэкенд через rewrite. `vercel.app` входит в Public Suffix List, поэтому между разными `*.vercel.app` refresh-cookie не работает. CORS не нужен и не включён.

Проверка после деплоя: `https://<web>/api/v1/health` отвечает 200.

### Что нельзя ломать в сборке

- В `apps/api/src/app.ts` нельзя импортировать из голого пакета `hono`, даже типы, а в `src/index.ts` такой импорт обязателен. Vercel берёт точкой входа первый файл с этим импортом, и `src/app.ts` проверяется раньше.
- `module` должен быть задан прямо в `apps/api/tsconfig.json`. Vercel читает этот файл без учёта `extends` и иначе выключает `strict`, после чего билд падает, хотя локальный `tsc` проходит.

Оба правила закреплены в `apps/api/test/vercel-entrypoint.test.ts`.

## Что обновить на фронте после мутации

| Мутация | Обновить |
|---|---|
| `POST /boards` | список досок, nav-summary |
| favorite | список досок и деталь доски, оптимистично |
| members | деталь доски |
| создание задачи | задачи доски, nav-summary, мои задачи, task-stats, KPI активного спринта |
| `PATCH /tasks/:key` | карточку в кэше, nav-summary, мои задачи, task-stats, KPI активного спринта |
| pause, resume, take-lock | карточку в кэше ответом `TaskCard` |
| links | деталь задачи, задачи досок обеих задач |
| comments | добавить ответ в деталь задачи |
| `PATCH /me` | me |
