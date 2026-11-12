# goodWebManTasks

ESLint и FSD: `npm run lint`; проверка правил на примерах: `npm run test:lint`. Подключение и покрытие проверок: [docs/eslint.md](docs/eslint.md).
Полная локальная проверка: `npm run validate` (включая тесты фронтенда).
Sentry для frontend и API: [бесплатное подключение, source maps и перенос в другой проект](docs/sentry.md).
[Как найти и понять ошибку в Sentry, связать frontend с API](docs/sentry-errors.md).
Правила импортов описаны в [docs/fsd.md](docs/fsd.md), сравнение с `pc` и приоритеты подготовки к production — в [docs/production-readiness.md](docs/production-readiness.md).

Мини-Jira: канбан-доски, задачи, спринты и KPI. Монорепозиторий на npm workspaces.

| Папка                 | Что внутри                                                                             |
| --------------------- | -------------------------------------------------------------------------------------- |
| `apps/api`            | Бэкенд: Hono, Drizzle, Neon. Деплоится на Vercel                                       |
| `apps/web`            | Фронтенд: React и Vite                                                                 |
| `packages/contracts`  | Общие zod-схемы, типы, подписи и правила доступа `permissions.ts`. Собирается в `dist` |
| `packages/monitoring` | Переносимое ядро Sentry для frontend и API, без зависимостей от приложения             |

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

| Email                  | Роль на GWT   |
| ---------------------- | ------------- |
| `anna@example.com`     | Администратор |
| `dmitry@example.com`   | Рабочий       |
| `viktoria@example.com` | Гость         |

Сид идемпотентен и отказывается работать при `NODE_ENV=production`.

## Команды

| Команда                 | Что делает                                                                        |
| ----------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`           | Собирает contracts и запускает фронтенд и бэкенд вместе                           |
| `npm test`              | Собирает contracts и запускает все тесты. Сеть и Docker не нужны, база это PGlite |
| `npm run typecheck`     | Проверка типов contracts, api и web                                               |
| `npm run build`         | Сборка contracts и фронта                                                         |
| `npm run db:generate`   | Новая миграция по изменениям в `apps/api/src/db/schema.ts`                        |
| `npm run db:migrate`    | Применяет миграции через `DATABASE_URL_UNPOOLED`                                  |
| `npm run db:seed`       | Заполняет базу данными прототипа                                                  |
| `npm run dev:contracts` | Пересобирает contracts при изменениях                                             |
| `npm run docs`          | Swagger UI без базы и `.env`                                                      |
| `npm run openapi`       | Обновляет `docs/openapi.json`                                                     |

## Проверки кода и коммитов

`npm install` подключает Git-хуки через Husky. Перед коммитом lint-staged запускает ESLint и Prettier для подготовленных файлов: исправления автоматически попадают в коммит, а оставшиеся ошибки и предупреждения ESLint блокируют его.

Проверки выполняются в `commit-msg`: сначала проверяется сообщение коммита, затем все подготовленные файлы, даже если сообщение неверное. Для подготовленных TS/TSX-файлов lint-staged также запускает проверку типов, временно скрывая неподготовленные правки этих файлов. После этого ESLint и TypeScript проверяют всё рабочее дерево, включая изменения, ещё не добавленные через `git add`. TypeScript проверяет contracts, api и web и блокирует коммит при неизвестных именах (например, `Num2ber`) и ошибках типов. Консоль показывает нарушения commitlint, вывод ESLint, Prettier и TypeScript с файлами и строками ошибок и итоговую причину отказа. Проверки продолжаются после ошибок, чтобы показать все причины отказа. На Windows ESLint и Prettier запускаются напрямую через Node.js, а длинные списки подготовленных файлов разбиваются на части.

Сообщение коммита должно иметь формат `type: описание` или `type(scope): описание`, например `feat(auth): добавить вход`. Допустимые типы: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Описание — до 72 символов; русский текст разрешён.

Для проверки всего репозитория: `npm run lint` и `npm run format:check`. Для исправлений: `npm run lint:fix` и `npm run format`.

Веб-приложение подключает `AppProviders` из `src/app/providers`: Error Boundary показывает запасной экран с кнопкой перезагрузки при ошибке рендера, QueryClientProvider передаёт существующий клиент запросов.

## Контракт API

Полное описание всех ручек: группы, поля, ограничения, коды ошибок, правила токенов и ролей.

| Как смотреть              | Где                                                               |
| ------------------------- | ----------------------------------------------------------------- |
| Swagger без базы и `.env` | `npm run docs`, затем http://localhost:3001/api/v1/docs           |
| Swagger на запущенном API | http://localhost:5173/api/v1/docs или `https://<web>/api/v1/docs` |
| Файл OpenAPI 3.1          | [docs/openapi.json](docs/openapi.json)                            |
| Тот же JSON с сервера     | `GET /api/v1/openapi.json`                                        |

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
  TASK_STATUS_LABELS,
  type TaskCard,
  allowedStatuses,
  createTaskBodySchema,
} from '@gwmt/contracts';
```

Перед запуском фронта общие пакеты должны быть собраны: `npm run build:shared`. Для пересборки contracts при изменениях используйте `npm run dev:contracts`; после изменения ядра мониторинга — `npm run build -w @gwmt/monitoring`. Сборка на Vercel уже собирает общие пакеты первой.

Если нужен сгенерированный клиент, файл подходит для генераторов, и у каждой ручки есть `operationId`:

```bash
npx openapi-typescript docs/openapi.json -o apps/web/src/api/schema.d.ts
```

## Переменные окружения

Фронтенд читает `apps/web/.env` через `env` из `@/shared/config` — это единственная точка доступа к `import.meta.env`. `VITE_API_URL=/api/v1` использует локальный Vite proxy; для отдельного API задайте полный адрес с префиксом, например `https://api.example.com/api/v1`. `VITE_AUTH_SALT` и `VITE_APP_VERSION` задают подпись входа. После изменения `.env` перезапустите Vite; значения `VITE_*` попадают в браузерный бандл.

Запросы приложения идут через `apiClient` из `@/shared/api`: `apiClient.get<Me>('/me')`, `apiClient.post('/tasks', body)`. Клиент добавляет API URL, сериализует JSON, поддерживает FormData и бросает `ApiError` со статусом и телом ответа. При старте `app/init-auth.ts` подключает `authService.fetch`, который обновляет токен и повторяет запросы. Запросы входа, refresh и logout используют обычный fetch, чтобы refresh не ждал сам себя. Импорты между модулями используют `@/` (каталог `apps/web/src`); алиас работает в TypeScript, Vite и Vitest.

Список лежит в `apps/api/.env.example`. Бэкенд проверяет их при старте и не запустится с неверными значениями.

| Имя                                        | Смысл                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `DATABASE_URL`                             | Пулерное подключение Neon, им пользуется приложение                          |
| `DATABASE_URL_UNPOOLED`                    | Прямое подключение Neon, только для миграций и сида                          |
| `JWT_ACCESS_SECRET`                        | Минимум 32 байта                                                             |
| `SALT_SECRET`                              | Минимум 32 байта. Из него получается соль сборки клиента                     |
| `APP_URL`                                  | Публичный origin фронта без слэша на конце. Локально `http://localhost:5173` |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | OAuth App на GitHub                                                          |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth-клиент Google                                                          |
| `NODE_ENV`                                 | На Vercel выставляется сам                                                   |

## Деплой

Приложение разворачивается **одним проектом Vercel через Services**.
В корневом ercel.json описаны Hono API (pps/api) и Vite frontend (pps/web).
Root Directory при импорте — ./, Application Preset — Services.
/api/... направляется в API, остальные адреса — во frontend на том же домене.

Пошаговая настройка на экране импорта, Neon через Vercel Marketplace,
переменные, миграции и проверка:
[docs/vercel-services.md](docs/vercel-services.md).

API build применяет миграции к базе из DATABASE_URL_UNPOOLED выбранного
окружения. Не подключайте preview deployments к production-базе.
Frontend source maps загружаются в Sentry при наличии build-токена.

Vercel Services находится в Beta. Первую облачную сборку нужно проверить
после подключения Neon и добавления переменных проекта.

## Что обновить на фронте после мутации

| Мутация                  | Обновить                                                                    |
| ------------------------ | --------------------------------------------------------------------------- |
| `POST /boards`           | список досок, nav-summary                                                   |
| favorite                 | список досок и деталь доски, оптимистично                                   |
| members                  | деталь доски                                                                |
| создание задачи          | задачи доски, nav-summary, мои задачи, task-stats, KPI активного спринта    |
| `PATCH /tasks/:key`      | карточку в кэше, nav-summary, мои задачи, task-stats, KPI активного спринта |
| pause, resume, take-lock | карточку в кэше ответом `TaskCard`                                          |
| links                    | деталь задачи, задачи досок обеих задач                                     |
| comments                 | добавить ответ в деталь задачи                                              |
| `PATCH /me`              | me                                                                          |
