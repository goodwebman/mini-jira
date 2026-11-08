import { forwardRef, memo, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface IUISkeletonProps extends HTMLAttributes<HTMLDivElement> {
  readonly testId?: string;
}

/**
 * Заглушка на время загрузки. Форма задаётся классами: `h-4 w-1/2`, `size-avatar-md rounded-full`.
 */
const UISkeletonBase = forwardRef<HTMLDivElement, IUISkeletonProps>(
  ({ className, testId, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      data-name={testId ? `UISkeleton-${testId}` : 'UISkeleton'}
      className={cn(
        'animate-shimmer rounded-control bg-[linear-gradient(90deg,var(--muted)_25%,var(--column)_50%,var(--muted)_75%)] bg-size-[200%_100%]',
        className,
      )}
      {...props}
    />
  ),
);
UISkeletonBase.displayName = 'UISkeleton';
export const UISkeleton = memo(UISkeletonBase);
