# shared: UI-кит и утилиты

Нижний слой FSD. Выше него импортируем только через публичный API.

| Импорт                 | Что внутри                                   |
| ---------------------- | -------------------------------------------- |
| `@/shared/ui`          | все компоненты, `UIIcons`, `useToast`        |
| `@/shared/ui/UIButton` | один компонент (у каждого свой `index.ts`)   |
| `@/shared/ui/icons`    | именованные иконки: `Check`, `Link`, `User`… |
| `@/shared/lib`         | `cn`, `useCn`, хуки, `Portal`, `Slot`        |
| `styles/index.css`     | токены и Tailwind; подключается один раз     |

## Подключение

`src/index.css` уже импортирует стили кита. Для тостов оберни приложение один раз:

```tsx
<UIToastProvider>
  <App />
</UIToastProvider>
```

## Токены

Цвета и размеры пишем только классами. Стандартная палитра Tailwind отключена:
`bg-red-500` и `text-lg` просто не соберутся.

| Что            | Классы                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Поверхности    | `bg-background` `bg-surface` `bg-column` `bg-muted`                                                |
| Текст          | `text-foreground` `text-muted-foreground`                                                          |
| Линии          | `border-border` `border-border-strong` `border-input`                                              |
| Акцент         | `bg-primary` `bg-primary-hover` `bg-primary-tint` `text-primary-hover`                             |
| Семантика      | `destructive` `warning` `success` + `-tint`, `-emphasis`                                           |
| Статусы        | `bg-status-work` `bg-status-work-tint` `text-status-work-emphasis` (`todo` `review` `test` `done`) |
| Графики        | `var(--chart-1)` … `var(--chart-4)`, `var(--chart-neutral)`, `var(--chart-plan)`                   |
| Шрифт          | `text-micro` `caption` `small` `body` `lead` `title` `heading` `display` `metric` `hero` `field`   |
| Скругления     | `rounded-tag` `control` `card` `block` `modal`                                                     |
| Тени           | `shadow-popover` `toast` `modal` `drawer`                                                          |
| Высоты         | `h-control-sm` `h-control` `h-control-lg` `h-chip` `h-header` `h-table-row`                        |
| Иконки, аватар | `size-icon-sm` `size-icon` `size-icon-lg`, `size-avatar-xs` … `xl`                                 |
| Каркас         | `p-page` `gap-section` `w-sidebar`                                                                 |

Брейкпоинты совпадают с макетами: `sm` 520 (640), `md` 800 (960), `lg` 1280 (1440), `xl` 1800 (1920).
Токены сами меняются по ширине, поэтому `h-control` — это 40 px, 44 на узких и 48 на 1920.

Отступы `1`–`6` тоже адаптивные: `p-4` — 16 px, на 1920 — 20. Размер, который расти
не должен, задаём явно: `size-[18px]`.

Новый токен добавляем в трёх местах: `styles/tokens.css`, `styles/theme.css`
и список в `lib/cn/cn.ts` (иначе `cn` склеит классы неверно, тест это поймает).

## Как устроен компонент

```
UIButton/
├── UIButton.tsx           # forwardRef + memo, displayName, JSDoc
├── UIButton.variants.ts   # cva; отдельно, чтобы не ломать Fast Refresh
├── UIButton.test.tsx
└── index.ts               # публичный API компонента
```

- Пропсы: `IUI<Name>Props`, `testId` превращается в `data-name="UI<Name>-<testId>"`.
- Классы только через `cn`, чтобы `className` вызывающего перебивал варианты.
- Составные: `UIDialog.Content`, собираются через `Object.assign` в `index.ts`.
- Роутерные ссылки: проп `render` — `<UILink render={<Link to="/boards" />}>Доски</UILink>`.

## Иконки

1. Положи `ui/icons/raw/<kebab-name>.svg`.
2. `npm run icons:build -w mini-jira`.
3. Используй `<UIIcons.KebabName />`.

Цвет наследуется от текста, размер — `size-icon*`. Без `title` или `aria-label` иконка декоративная.

## Проверки

```bash
npm run typecheck -w mini-jira
npm run lint -w mini-jira
npm run test -w mini-jira
npm run icons:check -w mini-jira
```
