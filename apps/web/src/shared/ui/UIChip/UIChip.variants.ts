import { cva } from 'class-variance-authority';

export const chipVariants = cva(
  [
    'inline-flex h-chip shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-small font-medium text-foreground w640:px-3 w1920:px-3.5',
    'transition-colors duration-150 focus-ring focus-visible:-outline-offset-2',
    'disabled:cursor-not-allowed disabled:text-muted-foreground',
  ],
  {
    variants: {
      variant: {
        /** Фильтр: при `pressed` подсвечивается акцентом. */
        filter: null,
        /** Действие «Добавить» с пунктирной рамкой. */
        dashed:
          'border-dashed border-input bg-transparent text-subtle-foreground enabled:hover:bg-surface',
        /** Статус на телефоне: выбирает колонку доски. */
        status: null,
      },
    },
    compoundVariants: [
      {
        variant: ['filter', 'status'],
        class: [
          'border-border-strong bg-surface enabled:hover:border-input enabled:hover:bg-muted',
          'aria-pressed:border-primary aria-pressed:bg-primary-tint aria-pressed:font-semibold aria-pressed:text-primary-hover aria-pressed:enabled:hover:border-primary aria-pressed:enabled:hover:bg-primary-tint-strong',
        ],
      },
    ],
    defaultVariants: { variant: 'filter' },
  },
);
