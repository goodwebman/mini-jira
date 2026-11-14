# mini-jira: веб-клиент

React 19 + React Compiler, React Router 8, TanStack Query 5, Tailwind 4 на токенах UI-кита.

- Архитектура, скоупы зависимостей, данные и тесты — [docs/frontend-architecture.md](../../docs/frontend-architecture.md).
- Правила FSD и импортов — [docs/fsd.md](../../docs/fsd.md).
- Почему без стейт-менеджера — [docs/adr/0001-state-management.md](../../docs/adr/0001-state-management.md).
- UI-кит — [src/shared/README.md](src/shared/README.md), авторизация — [src/entities/auth/README.md](src/entities/auth/README.md).

```bash
npm run dev:web             # из корня: только фронтенд, API через Vite proxy
npm run test -w mini-jira   # тесты
npm run typecheck -w mini-jira
```

Сборка с `SENTRY_AUTH_TOKEN` в `.env` загружает source maps в Sentry. Для локальной проверки сборки без загрузки: `SENTRY_AUTH_TOKEN= npm run build -w mini-jira`.
