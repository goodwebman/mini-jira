# Рефакторинг pages

Пути в таблице указаны относительно `apps/web/src`. Инвентаризация снята с рабочего дерева перед переносами, включая неотслеживаемые файлы.

| Старый путь                                                | Текущая роль                | Новый путь / роль                                                           |
| ---------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `pages/auth/index.ts`                                      | public API                  | остаётся (page)                                                             |
| `pages/auth/ui/AuthIllustration.tsx`                       | page/resolver               | остаётся (page)                                                             |
| `pages/auth/ui/AuthLayout.tsx`                             | page/resolver               | остаётся (page)                                                             |
| `pages/auth/ui/LoginPage.tsx`                              | page/resolver               | остаётся (page)                                                             |
| `pages/auth/ui/RegisterPage.tsx`                           | page/resolver               | остаётся (page)                                                             |
| `pages/board/index.ts`                                     | public API                  | остаётся (page)                                                             |
| `pages/board/ui/AssigneeFilterChips.tsx`                   | presentation/layout/utility | `widgets/kanban-board/ui/AssigneeFilterChips.tsx` (widget)                  |
| `pages/board/ui/BoardLayout/BoardLayoutColumns.tsx`        | presentation/layout/utility | `widgets/kanban-board/ui/BoardLayout/BoardLayoutColumns.tsx` (widget)       |
| `pages/board/ui/BoardLayout/BoardLayoutPeople.tsx`         | presentation/layout/utility | `widgets/kanban-board/ui/BoardLayout/BoardLayoutPeople.tsx` (widget)        |
| `pages/board/ui/BoardLayout/BoardLayoutPhoneColumns.tsx`   | presentation/layout/utility | `widgets/kanban-board/ui/BoardLayout/BoardLayoutPhoneColumns.tsx` (widget)  |
| `pages/board/ui/BoardLayout/BoardLayoutRoot.tsx`           | presentation/layout/utility | `widgets/kanban-board/ui/BoardLayout/BoardLayoutRoot.tsx` (widget)          |
| `pages/board/ui/BoardLayout/BoardLayoutToolbar.tsx`        | presentation/layout/utility | `widgets/kanban-board/ui/BoardLayout/BoardLayoutToolbar.tsx` (widget)       |
| `pages/board/ui/BoardLayout/index.ts`                      | presentation/layout/utility | `widgets/kanban-board/ui/BoardLayout/index.ts` (widget)                     |
| `pages/board/ui/BoardPage.tsx`                             | page/resolver               | остаётся (page)                                                             |
| `pages/board/ui/BoardScreen.tsx`                           | page/resolver               | остаётся (page)                                                             |
| `pages/board/ui/KanbanBoard.tsx`                           | presentation/layout/utility | `widgets/kanban-board/ui/KanbanBoard.tsx` (widget)                          |
| `pages/board/ui/PhoneColumnChips.tsx`                      | presentation/layout/utility | `widgets/kanban-board/ui/PhoneColumnChips.tsx` (widget)                     |
| `pages/board-members/index.ts`                             | public API                  | остаётся (page)                                                             |
| `pages/board-members/ui/BoardMembersPage.tsx`              | page/resolver               | остаётся (page)                                                             |
| `pages/board-members/ui/MemberRow.tsx`                     | presentation/layout/utility | `widgets/board-members-list/ui/MemberRow.tsx` (widget)                      |
| `pages/board-members/ui/MembersLayout.tsx`                 | presentation/layout/utility | `widgets/board-members-list/ui/MembersLayout.tsx` (widget)                  |
| `pages/board-members/ui/MembersScreen.tsx`                 | page/resolver               | остаётся (page)                                                             |
| `pages/board-members/ui/RolesLegendCard.tsx`               | presentation/layout/utility | `widgets/board-members-list/ui/RolesLegendCard.tsx` (widget)                |
| `pages/boards/index.ts`                                    | public API                  | остаётся (page)                                                             |
| `pages/boards/ui/BoardsPage.tsx`                           | page/resolver               | остаётся (page)                                                             |
| `pages/kpi/index.ts`                                       | public API                  | остаётся (page)                                                             |
| `pages/kpi/lib/chart-colors.ts`                            | presentation/layout/utility | `widgets/kpi-dashboard/lib/chart-colors.ts` (widget)                        |
| `pages/kpi/ui/CurrentSprintRedirect.tsx`                   | page/resolver               | остаётся (page)                                                             |
| `pages/kpi/ui/FirstBoardRedirect.tsx`                      | page/resolver               | остаётся (page)                                                             |
| `pages/kpi/ui/KpiBurndownPanel.tsx`                        | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiBurndownPanel.tsx` (widget)                    |
| `pages/kpi/ui/KpiCharts.tsx`                               | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiCharts.tsx` (widget)                           |
| `pages/kpi/ui/KpiDashboard.tsx`                            | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiDashboard.tsx` (widget)                        |
| `pages/kpi/ui/KpiFlowPanel.tsx`                            | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiFlowPanel.tsx` (widget)                        |
| `pages/kpi/ui/KpiLayout/index.ts`                          | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiLayout/index.ts` (widget)                      |
| `pages/kpi/ui/KpiLayout/KpiGrid.tsx`                       | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiLayout/KpiGrid.tsx` (widget)                   |
| `pages/kpi/ui/KpiLayout/KpiPanel.tsx`                      | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiLayout/KpiPanel.tsx` (widget)                  |
| `pages/kpi/ui/KpiLayout/spans.ts`                          | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiLayout/spans.ts` (widget)                      |
| `pages/kpi/ui/KpiPage.tsx`                                 | page/resolver               | остаётся (page)                                                             |
| `pages/kpi/ui/KpiSelectionBar.tsx`                         | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiSelectionBar.tsx` (widget)                     |
| `pages/kpi/ui/KpiSkeleton.tsx`                             | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiSkeleton.tsx` (widget)                         |
| `pages/kpi/ui/KpiStagesPanel.tsx`                          | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiStagesPanel.tsx` (widget)                      |
| `pages/kpi/ui/KpiStatusPanel.tsx`                          | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiStatusPanel.tsx` (widget)                      |
| `pages/kpi/ui/KpiTeamPanel.tsx`                            | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiTeamPanel.tsx` (widget)                        |
| `pages/kpi/ui/KpiTilePanels.tsx`                           | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiTilePanels.tsx` (widget)                       |
| `pages/kpi/ui/KpiVelocityPanel.tsx`                        | presentation/layout/utility | `widgets/kpi-dashboard/ui/KpiVelocityPanel.tsx` (widget)                    |
| `pages/my-tasks/index.ts`                                  | public API                  | остаётся (page)                                                             |
| `pages/my-tasks/model/my-tasks-params.test.ts`             | URL state/test              | остаётся (page)                                                             |
| `pages/my-tasks/model/my-tasks-params.ts`                  | URL state/test              | остаётся (page)                                                             |
| `pages/my-tasks/ui/MyTasksCards.tsx`                       | presentation/layout/utility | `widgets/my-tasks-list/ui/MyTasksCards.tsx` (widget)                        |
| `pages/my-tasks/ui/MyTasksLayout/index.ts`                 | presentation/layout/utility | `widgets/my-tasks-list/ui/MyTasksLayout/index.ts` (widget)                  |
| `pages/my-tasks/ui/MyTasksLayout/MyTasksLayoutFilters.tsx` | presentation/layout/utility | `widgets/my-tasks-list/ui/MyTasksLayout/MyTasksLayoutFilters.tsx` (widget)  |
| `pages/my-tasks/ui/MyTasksLayout/MyTasksLayoutPager.tsx`   | presentation/layout/utility | `widgets/my-tasks-list/ui/MyTasksLayout/MyTasksLayoutPager.tsx` (widget)    |
| `pages/my-tasks/ui/MyTasksLayout/MyTasksLayoutRoot.tsx`    | presentation/layout/utility | `widgets/my-tasks-list/ui/MyTasksLayout/MyTasksLayoutRoot.tsx` (widget)     |
| `pages/my-tasks/ui/MyTasksPage.tsx`                        | page/resolver               | остаётся (page)                                                             |
| `pages/my-tasks/ui/MyTasksPager.tsx`                       | presentation/layout/utility | `widgets/my-tasks-list/ui/MyTasksPager.tsx` (widget)                        |
| `pages/my-tasks/ui/MyTasksTable.tsx`                       | presentation/layout/utility | `widgets/my-tasks-list/ui/MyTasksTable.tsx` (widget)                        |
| `pages/not-found/index.ts`                                 | public API                  | остаётся (page)                                                             |
| `pages/not-found/ui/NotFoundPage.tsx`                      | page/resolver               | остаётся (page)                                                             |
| `pages/profile/index.ts`                                   | public API                  | остаётся (page)                                                             |
| `pages/profile/ui/PersonalDataCard.tsx`                    | presentation/layout/utility | `widgets/profile-overview/ui/PersonalDataCard.tsx` (widget)                 |
| `pages/profile/ui/ProfileLayout/index.ts`                  | presentation/layout/utility | `widgets/profile-overview/ui/ProfileLayout/index.ts` (widget)               |
| `pages/profile/ui/ProfileLayout/ProfileLayoutAside.tsx`    | presentation/layout/utility | `widgets/profile-overview/ui/ProfileLayout/ProfileLayoutAside.tsx` (widget) |
| `pages/profile/ui/ProfileLayout/ProfileLayoutMain.tsx`     | presentation/layout/utility | `widgets/profile-overview/ui/ProfileLayout/ProfileLayoutMain.tsx` (widget)  |
| `pages/profile/ui/ProfileLayout/ProfileLayoutRoot.tsx`     | presentation/layout/utility | `widgets/profile-overview/ui/ProfileLayout/ProfileLayoutRoot.tsx` (widget)  |
| `pages/profile/ui/ProfilePage.tsx`                         | page/resolver               | остаётся (page)                                                             |
| `pages/profile/ui/ProfileScreen.tsx`                       | page/resolver               | остаётся (page)                                                             |
| `pages/profile/ui/RecentTasksCard.tsx`                     | presentation/layout/utility | `widgets/profile-overview/ui/RecentTasksCard.tsx` (widget)                  |
| `pages/profile/ui/SecurityCard.tsx`                        | presentation/layout/utility | `widgets/profile-overview/ui/SecurityCard.tsx` (widget)                     |
| `pages/profile/ui/TaskStatsCard.tsx`                       | presentation/layout/utility | `widgets/profile-overview/ui/TaskStatsCard.tsx` (widget)                    |
| `pages/task/index.ts`                                      | public API                  | остаётся (page)                                                             |
| `pages/task/ui/TaskCommentsCard.tsx`                       | presentation/layout/utility | `widgets/task-detail/ui/TaskCommentsCard.tsx` (widget)                      |
| `pages/task/ui/TaskLayout.tsx`                             | presentation/layout/utility | `widgets/task-detail/ui/TaskLayout.tsx` (widget)                            |
| `pages/task/ui/TaskLinksCard.tsx`                          | presentation/layout/utility | `widgets/task-detail/ui/TaskLinksCard.tsx` (widget)                         |
| `pages/task/ui/TaskPage.tsx`                               | page/resolver               | остаётся (page)                                                             |
| `pages/task/ui/TaskPropertiesCard.tsx`                     | presentation/layout/utility | `widgets/task-detail/ui/TaskPropertiesCard.tsx` (widget)                    |
| `pages/task/ui/TaskPropertyRow.tsx`                        | presentation/layout/utility | `widgets/task-detail/ui/TaskPropertyRow.tsx` (widget)                       |
| `pages/task/ui/TaskReadOnlyProperties.tsx`                 | presentation/layout/utility | `widgets/task-detail/ui/TaskReadOnlyProperties.tsx` (widget)                |
| `pages/task/ui/TaskScreen.tsx`                             | page/resolver               | остаётся (page)                                                             |
| `pages/task/ui/TaskSummaryCard.tsx`                        | presentation/layout/utility | `widgets/task-detail/ui/TaskSummaryCard.tsx` (widget)                       |
| `pages/task/ui/TaskView.tsx`                               | presentation/layout/utility | `widgets/task-detail/ui/TaskView.tsx` (widget)                              |
| `pages/task-link/index.ts`                                 | public API                  | остаётся (page)                                                             |
| `pages/task-link/ui/TaskLinkPage.tsx`                      | page/resolver               | остаётся (page)                                                             |
| `pages/task-link/ui/TaskRedirect.tsx`                      | page/resolver               | остаётся (page)                                                             |

## Дополнения к инвентаризации

Создан `pages/kpi/ui/KpiScreen.tsx`: suspense-ветка данных выбранного спринта и запись выбора в URL. Публичные `pages/*/index.ts` и импорты страниц в роутере и его тестах сохранены.

После усиления линтера разделены компоненты UI-кита. Все пути ниже также относительно `apps/web/src`; прежние входы сохранены, типы вынесены в `types.ts` соответствующей папки.

| Старый файл в shared/ui         | Компоненты в отдельных файлах той же папки                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `UIBottomNav/UIBottomNav.tsx`   | `UIBottomNavRoot.tsx`, `UIBottomNavItem.tsx`                                                                           |
| `UICard/UICardParts.tsx`        | `UICardHeader.tsx`, `UICardTitle.tsx`, `UICardDescription.tsx`, `UICardContent.tsx`, `UICardFooter.tsx`                |
| `UIDialog/UIDialogParts.tsx`    | `UIDialogBody.tsx`, `UIDialogFooter.tsx`, `UIDialogClose.tsx`                                                          |
| `UIDrawer/UIDrawer.tsx`         | `UIDrawer.tsx`, `DrawerPanel.tsx`                                                                                      |
| `UIPageHeader/UIPageHeader.tsx` | `UIPageHeaderRoot.tsx`, `UIPageHeaderAction.tsx`                                                                       |
| `UIPopover/UIPopover.tsx`       | `UIPopover.tsx`, `PopoverPanel.tsx`                                                                                    |
| `UITabBar/UITabBar.tsx`         | `UITabBarRoot.tsx`, `UITabBarItem.tsx`                                                                                 |
| `UITable/UITableParts.tsx`      | `UITableHead.tsx`, `UITableBody.tsx`, `UITableRow.tsx`, `UITableHeadCell.tsx`, `UITableCell.tsx`, `UITableRowLink.tsx` |
| `UITooltip/UITooltip.tsx`       | `UITooltip.tsx`, `TooltipBubble.tsx`                                                                                   |

## Счётчики

Считаются все файлы внутри `ui`, включая вложенные Layout, `index.ts` и утилиты; для widgets — все файлы слайсов, включая их публичные API.

| Метрика              |  До | После |
| -------------------- | --: | ----: |
| Файлы в `pages/*/ui` |  70 |    21 |
| Файлы в `widgets`    |  14 |    71 |
| Слайсы widgets       |   2 |     8 |

Перемещён 51 файл: 50 из `ui` и `kpi/lib/chart-colors.ts`. Добавлены шесть публичных API виджетов и один KPI-резолвер в pages. Тестов внутри перемещённых блоков не было; `my-tasks-params.test.ts` остаётся рядом с URL-моделью.

## Решения

- `BoardScreen` остаётся медиатором в pages: чтение suspense-запросов под `AsyncBoundary`, права, фильтры, композиция `app-shell`, канбана и диалога создания задачи. Он не становится виджетом с зависимостью от соседнего `app-shell`.
- `ProfileScreen` и `MembersScreen` остаются suspense-ветками чтения данных и композиции под границами страниц. Пустых прокси-компонентов не добавлено.
- `TaskScreen` сохраняет редирект на настоящую доску задачи; в нём теперь собираются `ShellPage` и `TaskView`. Поэтому `task-detail` не импортирует `app-shell`.
- `KpiScreen` отделяет данные и URL от отображения `KpiDashboard`. Диалог выбора и его локальное состояние остаются в виджете. `FirstBoardRedirect` и `CurrentSprintRedirect` сохранены отдельными: suspense-запросы не используют `enabled`.
- Все Layout-композиты перенесены целиком, Root и слоты остаются отдельными файлами. Новые widgets не импортируют соседние widgets или pages; полный ESLint проверяет слои и публичные API.
- `pages/my-tasks/model` сохраняет разбор адреса и его тест; новые `model` без необходимости не созданы. Цвета KPI перенесены в `widgets/kpi-dashboard/lib`.
- `pages/auth` и `pages/task-link` сохранены. README не менялись: текущие README не описывают структуру pages/widgets. Обновлены `frontend-architecture.md` и `fsd.md`; структура роутера сохранена.
- Правило ESLint теперь учитывает верхнеуровневые arrow-компоненты, function expressions, inline `memo`/`forwardRef`, формы `React.*`, именованные и анонимные default-экспорты и несколько переменных в одном объявлении. Локальная реализация и её `memo(XBase)` считаются одним компонентом; вспомогательные функции и тестовые файлы разрешены. Найденные 17 нарушений UI-кита исправлены разделением девяти файлов.

## Проверки

| Проверка                                                | Результат                     |
| ------------------------------------------------------- | ----------------------------- |
| `npx eslint .`                                          | зелёно, 0 ошибок              |
| `npx prettier --check .`                                | зелёно                        |
| `node --test scripts/eslint-config.test.mjs`            | зелёно, 230 тестов            |
| web: `npx tsc -p tsconfig.app.json --noEmit`            | зелёно                        |
| web: `npx vitest run`                                   | зелёно, 861 тест, 70 файлов   |
| API: `npx vitest run`                                   | зелёно, 470 тестов, 20 файлов |
| contracts: `npx vitest run`                             | зелёно, 42 теста, 2 файла     |
| monitoring: `npx vitest run`                            | зелёно, 41 тест, 1 файл       |
| web: Vite production build с пустым `SENTRY_AUTH_TOKEN` | зелёно, 1053 модуля           |

Все команды оболочки выполнялись через `rtk`; Vitest — через `rtk proxy`. Для сборки в Windows использован эквивалент `SENTRY_AUTH_TOKEN= npx vite build`, задающий пустую строку непосредственно в Node до загрузки Vite:

```powershell
rtk proxy node -e "process.env.SENTRY_AUTH_TOKEN=''; process.argv=['node','vite','build']; import('../../node_modules/vite/bin/vite.js');"
```

Это перекрывает значение из `.env`: Sentry-плагин загрузки source maps не подключается. `npm run build` и `npm run validate` не запускались. После web-тестов восстановлен `apps/web/.vitest/json/output.json`.

## Ограничения и оставшаяся работа

Запрошенные изменения выполнены. Ручная проверка в браузере не проводилась; поведение проверено существующими компонентными и интеграционными тестами роутера. API, контракты, адреса и определения маршрутов в рамках задачи не изменялись. В рабочем дереве уже были обширные пользовательские изменения, включая API: они сохранены. Коммиты и push не выполнялись.
