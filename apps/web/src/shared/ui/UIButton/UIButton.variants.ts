import { cva } from 'class-variance-authority';

/**
 * Карта вариантов кнопки. Экспортируется: потребитель может стилизовать под кнопку
 * ссылку, например `<Link className={buttonVariants({ variant: 'secondary' })} />`.
 */
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-control',
    'cursor-pointer select-none transition-colors duration-150 focus-ring',
    "[&_svg:not([class*='size-'])]:size-icon",
    'disabled:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary font-semibold text-primary-foreground hover:bg-primary-hover disabled:bg-border disabled:text-muted-foreground',
        secondary:
          'border border-border-strong bg-surface font-medium text-foreground hover:bg-muted disabled:border-border disabled:bg-background disabled:text-muted-foreground',
        ghost:
          'font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:text-disabled-foreground',
        danger:
          'border border-destructive bg-surface font-semibold text-destructive [--focus-color:var(--destructive)] hover:bg-destructive hover:text-destructive-foreground disabled:border-border disabled:bg-background disabled:text-muted-foreground',
        'danger-ghost':
          'font-medium text-destructive [--focus-color:var(--destructive)] hover:bg-destructive-tint disabled:text-disabled-foreground',
      },
      size: {
        sm: 'h-control-sm px-3 text-small',
        md: 'h-control px-4 text-body',
        lg: 'h-control-lg px-5 text-body',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);
