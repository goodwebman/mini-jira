# Первый деплой mini-jira одним проектом Vercel

Используется Vercel Services: корень репозитория `./`, сервис `web` (Vite)
и сервис `api` (Hono). Оба находятся на одном домене. Корневой `vercel.json`
отправляет `/api` и `/api/...` в API с сохранением пути, остальные адреса — в web.
Внутри web действует SPA fallback на index.html. Отдельный домен API не нужен.

## Экран импорта

1. Сохраните и отправьте изменения репозитория в свою Git-ветку: Vercel читает
   файлы из Git, а не с локального диска. Не добавляйте `.env`.
2. На экране импорта оставьте Team `goodwebman`, Project Name `mini-jira`,
   Root Directory `./`, Application Preset `Services`.
3. Не нажимайте Import single project на api/web: это другой способ импорта.
4. Обновите экран после push. Должны определиться два сервиса из корневого конфига.
5. В настройках Node.js выберите 24.x, если выбор доступен.

## Neon через Vercel

В Vercel Storage / Marketplace создайте Neon через Create New Neon Account,
выберите Free, регион рядом с API и название базы. Auth/Realtime этой интеграции
не нужны: в приложении уже есть собственная авторизация.

Подключите ресурс к единому проекту `mini-jira` через Connect Project без
префикса переменных. Нужны DATABASE_URL (pooler) и DATABASE_URL_UNPOOLED (direct).
Если проект ещё не создан, можно создать ресурс на уровне команды, скопировать
эти две переменные в Environment Variables на экране импорта, а затем подключить
ресурс к созданному проекту. Если первой попытке деплоя не хватает базы,
созданный проект можно открыть, подключить Storage и сделать Redeploy.

API build запускает `npm run build && npm run db:migrate`. Поэтому пустая база
получает схему при deployment. Если подключение/миграция неуспешны, deployment
не готов к использованию. Уже существующую базу подключайте только после проверки,
что это нужная база и её допустимо обновлять миграциями этого приложения.
Seed с демонстрационными паролями не запускается.

Для начала подключите Production. Для Preview включайте отдельные ветки базы,
если собираетесь использовать preview deployments: API build применяет миграции
к DATABASE_URL_UNPOOLED того окружения, в котором выполняется сборка.

## Переменные единого проекта

Services используют общие переменные проекта. VITE_* встраиваются в браузер;
секреты без этого префикса туда добавлять нельзя.

| Переменная                              | Значение                                                       |
| --------------------------------------- | -------------------------------------------------------------- |
| DATABASE_URL                            | Пулерная строка созданной базы Neon                            |
| DATABASE_URL_UNPOOLED                   | Прямая строка той же базы                                      |
| JWT_ACCESS_SECRET                       | Надёжный случайный секрет, минимум 32 байта                    |
| SALT_SECRET                             | Другой надёжный случайный секрет, минимум 32 байта             |
| APP_URL                                 | Фактический публичный origin этого проекта, без завершающего / |
| GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET | Ключи GitHub OAuth App                                         |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Ключи Google OAuth Client                                      |
| VITE_API_URL                            | /api/v1                                                        |
| VITE_APP_VERSION                        | Например 1.0.0                                                 |
| VITE_AUTH_SALT                          | SHA256(SALT_SECRET + VITE_APP_VERSION)                         |
| SENTRY_DSN                              | DSN API-проекта Sentry                                         |
| VITE_SENTRY_DSN                         | DSN React-проекта Sentry                                       |
| SENTRY_AUTH_TOKEN                       | Секретный токен загрузки frontend source maps                  |
| SENTRY_ORG                              | mini-jira                                                      |
| SENTRY_PROJECT                          | mini-jira-web, проект frontend source maps                     |

SENTRY_PROJECT используется плагином frontend source maps; выбор API-проекта
определяется его SENTRY_DSN. SENTRY_RELEASE можно не задавать: Vercel commit SHA
используется обоими сервисами. NODE_ENV и локальные PORT/API_PROXY_TARGET
не переносите из development .env на Vercel. Не ставьте
SENTRY_ENVIRONMENT=development или VITE_SENTRY_ENVIRONMENT=development для production:
environment определяется из VERCEL_ENV автоматически.

Секрет можно сгенерировать локально:

```powershell
rtk proxy node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Для frontend-хэша прочитайте именно тот SALT_SECRET, который будет в production.
Если он записан в локальном apps/api/.env, для версии 1.0.0:

```powershell
rtk proxy node --env-file=apps/api/.env -e "console.log(require('node:crypto').createHash('sha256').update(process.env.SALT_SECRET+'1.0.0').digest('hex'))"
```

Не копируйте всю локальную .env вслепую: локальный APP_URL отличается.
Пары OAuth обязательны текущему API. Callback GitHub:
`https://ВАШ-ДОМЕН/api/v1/auth/github/callback`; Google:
`https://ВАШ-ДОМЕН/api/v1/auth/google/callback`.

## Проверка deployment

1. В Build Logs API должна быть строка «Миграции применены».
2. В web build при заданном SENTRY_AUTH_TOKEN — успешная загрузка source maps.
3. После присвоения домена проверьте APP_URL; при отличии обновите и Redeploy.
4. `https://ВАШ-ДОМЕН/api/v1/health` должен вернуть JSON и HTTP 200.
5. Откройте вложенный frontend-маршрут напрямую и обновите страницу:
   SPA должна загрузиться, а /api/... не должен возвращать HTML frontend.
6. Проверьте регистрацию, вход и сохранение входа после обновления страницы.
7. Разбор ошибок и request_id: [sentry-errors.md](sentry-errors.md).

Локальная сборка и проверка схемы конфигурации не заменяют первый cloud deployment.
Vercel Services находится в Beta; официальные ссылки:
[Services](https://vercel.com/docs/services),
[Routing](https://vercel.com/docs/services/routing),
[Configuration](https://vercel.com/docs/services/config-reference),
[Neon integration](https://vercel.com/marketplace/neon).
