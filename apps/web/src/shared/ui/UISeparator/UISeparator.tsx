import { type HTMLAttributes, type ReactNode, forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';

export interface IUISeparatorProps extends HTMLAttributes<HTMLDivElement> {
  readonly testId?: string;
  readonly orientation?: 'horizontal' | 'vertical';
  /** Подпись по центру линии, например «или». Только для горизонтальной линии. */
  readonly label?: ReactNode;
}

/** Разделитель. */
const UISeparatorBase = forwardRef<HTMLDivElement, IUISeparatorProps>(
  ({ className, testId, orientation = 'horizontal', label, ...props }, ref) => {
    const dataName = testId ? `UISeparator-${testId}` : 'UISeparator';

    if (label != null && orientation === 'horizontal') {
      return (
        <div
          ref={ref}
          role='separator'
          data-name={dataName}
          className={cn(
            'flex items-center gap-3 text-muted-foreground',
            className,
          )}
          {...props}
        >
          <span aria-hidden='true' className='h-px flex-1 bg-border' />
          <span>{label}</span>
          <span aria-hidden='true' className='h-px flex-1 bg-border' />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        role='separator'
        aria-orientation={orientation}
        data-name={dataName}
        className={cn(
          'shrink-0 bg-border',
          orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
          className,
        )}
        {...props}
      />
    );
  },
);
UISeparatorBase.displayName = 'UISeparator';
export const UISeparator = memo(UISeparatorBase);
