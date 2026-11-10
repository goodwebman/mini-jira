import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, memo, type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

const iconTileVariants = cva('inline-flex shrink-0 items-center justify-center', {
  variants: {
    size: {
      sm: 'size-avatar-sm rounded-tag [&_svg]:size-icon-sm',
      md: 'size-avatar-md rounded-control [&_svg]:size-icon-lg',
      lg: 'size-avatar-lg rounded-control [&_svg]:size-icon-lg',
    },
    tint: {
      primary: 'bg-primary text-primary-foreground',
      blue: 'bg-tint-blue text-tint-blue-foreground',
      orange: 'bg-tint-orange text-tint-orange-foreground',
      green: 'bg-tint-green text-tint-green-foreground',
      violet: 'bg-tint-violet text-tint-violet-foreground',
      gray: 'bg-tint-gray text-tint-gray-foreground',
      pink: 'bg-tint-pink text-tint-pink-foreground',
    },
  },
  defaultVariants: { size: 'lg', tint: 'blue' },
});

export interface IUIIconTileProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof iconTileVariants> {
  readonly testId?: string;
}

/**
 * Иконка на цветной плашке: значок доски.
 *
 * @example
 * <UIIconTile tint="green"><UIIcons.Board /></UIIconTile>
 */
const UIIconTileBase = forwardRef<HTMLSpanElement, IUIIconTileProps>(
  ({ className, testId, size, tint, ...props }, ref) => (
    <span
      ref={ref}
      data-name={testId ? `UIIconTile-${testId}` : 'UIIconTile'}
      className={cn(iconTileVariants({ size, tint }), className)}
      {...props}
    />
  ),
);
UIIconTileBase.displayName = 'UIIconTile';
export const UIIconTile = memo(UIIconTileBase);
