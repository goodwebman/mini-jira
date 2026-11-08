import { cva } from 'class-variance-authority';

/** Единый вид текстовых контролов: состояния обычное, фокус, ошибка, недоступно. */
export const fieldControlVariants = cva(
  [
    'block w-full min-w-0 rounded-control border border-input bg-surface text-field text-foreground',
    'outline-none transition-[border-color,box-shadow] duration-150',
    'placeholder:text-muted-foreground',
    'focus:border-primary focus:ring-3 focus:ring-primary-tint',
    'aria-invalid:border-destructive aria-invalid:focus:ring-destructive-tint',
    'disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-muted-foreground',
  ],
  {
    variants: {
      size: {
        md: 'h-control',
        lg: 'h-control-lg',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
