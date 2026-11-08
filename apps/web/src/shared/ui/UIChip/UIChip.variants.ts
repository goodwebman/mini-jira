import { cva } from 'class-variance-authority';

export const chipVariants = cva(
  [
    'inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap font-medium text-foreground',
    'transition-colors duration-150 focus-ring',
    'disabled:cursor-not-allowed disabled:text-muted-foreground',
  ],
  {
    variants: {
      variant: {
        /** Фильтр: при `pressed` подсвечивается акцентом. */
        filter:
          'h-chip rounded-full border border-border-strong bg-surface px-3 text-small hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary-tint aria-pressed:text-primary-hover',
        /** Действие «Добавить» с пунктирной рамкой. */
        dashed:
          'h-chip rounded-full border border-dashed border-input bg-transparent px-3 text-small hover:bg-muted',
        /** Статус на телефоне: выбирает колонку доски. */
        status:
          'h-[44px] rounded-control bg-column px-[14px] text-body aria-pressed:bg-primary aria-pressed:text-primary-foreground',
      },
    },
    defaultVariants: { variant: 'filter' },
  },
);
