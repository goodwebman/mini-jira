# Проверка FSD

Конфигурация находится в корневом `eslint.config.js`. Используются `eslint-plugin-boundaries`, `eslint-plugin-import-x` и TypeScript resolver для `@/*`. См. [документацию boundaries/dependencies](https://www.jsboundaries.dev/docs/rules/dependencies/).

Полная схема подключения ESLint, правила TypeScript/React, Git-хуки и покрытие тестами описаны в [eslint.md](eslint.md).

## Правила

Порядок слоёв от верхнего к нижнему:

```text
app → pages → widgets → features → entities → shared
```

- Каждый слой может импортировать любой нижележащий слой.
- Слайсы одного слоя в `pages`, `widgets`, `features`, `entities` изолированы: `entities/task` не импортирует `entities/board` даже ради типа. Объединять их следует выше по слоям либо переносить действительно общий контракт в `packages/contracts`.
- Внутри своего слайса разрешены прямые импорты внутренних файлов.
- Из другого слайса или верхнего слоя вход только через `index.ts` слайса. Запрет действует и на относительные deep imports.
- У `app` и `shared` нет слайсов: внутри этих слоёв прямые импорты допустимы. Отдельный segment/submodule API в shared остаётся соглашением проекта.
- Неизвестная папка вроде `src/utils` не становится обходом FSD: ESLint сообщает `boundaries/no-unknown-files`.
- `src/main.tsx` — bootstrap: подключает `app` и корневой CSS. `App` лежит в `app`, галерея — в `pages/kit-gallery`.
- Единственный дополнительный тестовый вход: `entities/auth/testing.ts`, доступный из тестов слоя app. Продуктовый код импортирует `entities/auth`.

```ts
// В features/create-task: разрешено.
import { taskQueryOptions } from '@/entities/task';

// В shared: запрещено, включая реэкспорт.
export * from '@/widgets/board';

// В pages: запрещён обход публичного API.
import { taskQueryOptions } from '@/entities/task/api/taskQueries';
```

Проверяются обычные импорты, реэкспорты, `import type` и динамический `import()` с литеральным путём. Алиасы и относительные пути разрешаются до файла. Циклические и неразрешённые импорты также являются ошибками. Нарушения блокируют существующие Git-проверки; автоматическое исправление направления зависимости не выполняется.

## Команды

```sh
npm run lint       # Весь репозиторий, предупреждения тоже блокируют проверку
npm run lint:fix   # Автоматически исправимые нарушения
npm run test:lint  # Проверка реального поведения ESLint, без изменения src
npm run validate   # Lint, Prettier, типы, тесты web/api/contracts, production build
```

`test:lint` создаёт временную структуру проекта и проверяет матрицу зависимостей для всех шести слоёв, изоляцию слайсов, публичные API, запрет циклов, CSS-обхода и границы тестового входа auth. Отдельно проверяет работу правил Promise в настоящих TS-проектах workspaces. Временные файлы удаляются после тестов.

Дополнительно сохранена изоляция переносимого `entities/auth/lib`: ядро не импортирует React, клиент API или код приложения и получает браузерные API через `AuthPlatform`.
