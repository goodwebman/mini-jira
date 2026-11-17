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

Настройка сборки, значения параметров, альтернативы, development/production env,
анализ бандла и правила CDN: [docs/vite.md](../../docs/vite.md).

Production-сборка с `SENTRY_AUTH_TOKEN` загружает source maps в Sentry.
Для локальной проверки задайте `BUILD_SENTRY_UPLOAD=false` в `.env.production.local`.
`npm run build:analyze` из корня собирает production без upload и создаёт
`apps/web/reports/bundle.html`; этот отчёт не входит в `dist`.
