# Проверка FSD

Конфигурация находится в корневом `eslint.config.js`. Используются `eslint-plugin-boundaries`, `eslint-plugin-import-x` и TypeScript resolver для `@/*`. См. [документацию boundaries/dependencies](https://www.jsboundaries.dev/docs/rules/dependencies/).

Полная схема подключения ESLint, правила TypeScript/React, Git-хуки и покрытие тестами описаны в [eslint.md](eslint.md).

## Правила

Порядок слоёв от верхнего к нижнему:

```text
app → pages → widgets → features → entities → shared
```

- Каждый слой может импортировать любой нижележащий слой.
- `pages` читает адрес и данные, решает загрузку, ошибки, доступ и редиректы и собирает готовые блоки. Публичный `index.ts` слайса экспортирует только страницы; роутные резолверы остаются внутри `pages`.
- Презентационные блоки и их Layout-композиты (Root и слоты, по компоненту на файл) живут в `widgets`, даже если используются одной страницей. Виджеты не импортируют друг друга: их соединяет страница через публичные API. В `pages/*/model` — только состояние адреса и страницы; логика блока и его утилиты — в `widgets/*/{model,lib}`.
- Слайсы одного слоя в `pages`, `widgets`, `features`, `entities` изолированы: `entities/task` не импортирует `entities/board` даже ради типа. Объединять их следует выше по слоям либо переносить действительно общий контракт в `packages/contracts`.
- Фичи сгруппированы по сущности: `features/<сущность>/<действие>`, например `features/task/edit-task`, `features/comment/add-comment`. Слайс — это `features/task/edit-task`, а не папка группы. Соседние слайсы одной группы изолированы так же, как любые другие. Файл прямо в папке группы ESLint считает неизвестным.
- Внутри своего слайса разрешены прямые импорты внутренних файлов.
- Из другого слайса или верхнего слоя вход только через `index.ts` слайса. Запрет действует и на относительные deep imports.
- У `app` и `shared` нет слайсов, внутри этих слоёв прямые импорты допустимы. Снаружи shared открыт только через публичный API сегментов: `@/shared/ui`, `@/shared/api`, `@/shared/routes`, `@/shared/config`, `@/shared/lib/<name>` и отдельный вход иконок `@/shared/ui/icons`. Импорт вроде `@/shared/ui/UIToast` или `@/shared/lib/dom/position` — ошибка.
- В `shared` лежит то, что не знает о продукте. Экран, нужный только приложению (например, `ErrorBlock` с перезагрузкой страницы), живёт в `app/ui`. React-примитивы без вида (`ErrorBoundary`, `AsyncBoundary`) живут в `shared/lib/react`, а не в UI-ките.
- Один компонент на файл, на любом слое: function declarations, arrow-компоненты, function expressions и inline-обёртки `memo`/`forwardRef` (также `React.memo`/`React.forwardRef`), включая export и export default. Вспомогательные функции рядом с компонентом допустимы. Связка локального `XBase` + `export const X = memo(XBase)` считается одним компонентом. В тестах можно объявлять локальные компоненты.
- Неизвестная папка вроде `src/utils` не становится обходом FSD: ESLint сообщает `boundaries/no-unknown-files`.
- `src/main.tsx` — bootstrap: подключает `app` и корневой CSS. `App` и дерево роутов лежат в `app`, страницы подключаются лениво через `import('@/pages/<slice>')` — динамический импорт тоже идёт через публичный `index.ts`.
- Адреса страниц — только из `@/shared/routes` (`ROUTES.BOARD.build(id)`), строки путей в компонентах не пишутся.
- Внутри слайса кроме стандартных `ui`, `model`, `api` допустимы DI-файлы `*.di.ts` (токен `createDi` и хук) — они лежат в `model`. Скоупы зависимостей описаны в [frontend-architecture.md](frontend-architecture.md).
- Единственный дополнительный тестовый вход: `entities/auth/testing.ts`, доступный из тестов слоя app. Продуктовый код импортирует `entities/auth`.

```ts
// В features/task/create-task: разрешено.
import { taskQueryOptions } from '@/entities/task';

// В features/task/edit-task: запрещено, соседний слайс группы.
import { useTakeLock } from '@/features/task/take-lock';

// В pages: запрещено, мимо публичного API сегмента shared.
import { useToast } from '@/shared/ui/UIToast';

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

`test:lint` создаёт временную структуру проекта и проверяет матрицу зависимостей для всех шести слоёв, изоляцию слайсов и групп фич, публичные API слайсов и сегментов shared, правило «один компонент на файл», запрет циклов, CSS-обхода и границы тестового входа auth. Отдельно проверяет работу правил Promise в настоящих TS-проектах workspaces. Временные файлы удаляются после тестов.

Дополнительно сохранена изоляция переносимого `entities/auth/lib`: ядро не импортирует React, клиент API или код приложения и получает браузерные API через `AuthPlatform`.
