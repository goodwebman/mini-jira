import { cva } from 'class-variance-authority';

export const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold leading-none',
  {
    variants: {
      size: {
        xs: 'size-avatar-xs text-micro',
        sm: 'size-avatar-sm text-micro',
        md: 'size-avatar-md text-caption',
        lg: 'size-avatar-lg text-small',
        xl: 'size-avatar-xl text-display',
      },
      tint: {
        blue: 'bg-tint-blue text-tint-blue-foreground',
        orange: 'bg-tint-orange text-tint-orange-foreground',
        green: 'bg-tint-green text-tint-green-foreground',
        violet: 'bg-tint-violet text-tint-violet-foreground',
        gray: 'bg-tint-gray text-tint-gray-foreground',
        pink: 'bg-tint-pink text-tint-pink-foreground',
      },
    },
    defaultVariants: { size: 'md', tint: 'gray' },
  },
);
