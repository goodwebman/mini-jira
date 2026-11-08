import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  [
    'inline-flex min-w-0 max-w-full items-center gap-1 rounded-full px-3 py-1',
    "text-small font-medium [&_svg:not([class*='size-'])]:size-icon-sm",
  ],
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-subtle-foreground',
        accent: 'bg-primary-tint text-primary-hover',
        warning: 'bg-warning-tint text-warning-emphasis',
        review: 'bg-status-review-tint text-status-review-emphasis',
        test: 'bg-status-test-tint text-status-test-emphasis',
        success: 'bg-success-tint text-success',
        danger: 'bg-destructive-tint text-destructive',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);
