import { cva } from 'class-variance-authority';

export const iconButtonVariants = cva(
  [
    'inline-flex shrink-0 cursor-pointer items-center justify-center p-0',
    'transition-colors duration-150 focus-ring',
    'disabled:pointer-events-none disabled:text-disabled-foreground',
  ],
  {
    variants: {
      variant: {
        ghost: 'text-foreground hover:bg-muted',
        muted: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        secondary:
          'border border-border-strong bg-surface text-foreground hover:bg-muted',
        primary:
          'bg-primary text-primary-foreground hover:bg-primary-hover disabled:bg-border disabled:text-muted-foreground',
      },
      size: {
        /** 26 px, на узких 36: кнопка паузы на карточке. */
        xs: "size-icon-button [&_svg:not([class*='size-'])]:size-icon-sm",
        md: "size-control [&_svg:not([class*='size-'])]:size-icon-lg",
        lg: "size-control-lg [&_svg:not([class*='size-'])]:size-icon-lg",
      },
      shape: {
        square: 'rounded-control',
        round: 'rounded-full',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md', shape: 'square' },
  },
);
