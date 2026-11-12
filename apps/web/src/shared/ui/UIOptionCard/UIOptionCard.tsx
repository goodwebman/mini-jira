import {
  type ButtonHTMLAttributes,
  type ReactNode,
  forwardRef,
  memo,
} from 'react';

import { cn } from '@/shared/lib/cn';

export interface IUIOptionCardProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'title'
> {
  readonly testId?: string;
  readonly title: ReactNode;
  /** Вторая строка мелким текстом. */
  readonly meta?: ReactNode;
  /** Значение справа: например, статус или SP. */
  readonly aside?: ReactNode;
  /** Выбрана ли карточка. */
  readonly selected?: boolean;
}

/** Выбираемая строка-карточка: доска, спринт, задача для связи. */
const UIOptionCardBase = forwardRef<HTMLButtonElement, IUIOptionCardProps>(
  (
    {
      className,
      testId,
      title,
      meta,
      aside,
      selected,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      data-name={testId ? `UIOptionCard-${testId}` : 'UIOptionCard'}
      className={cn(
        'flex min-h-[calc(var(--control-md)+16px)] w-full cursor-pointer items-center gap-3 rounded-card',
        'border border-border-strong bg-surface px-3 py-2 text-left text-body text-foreground',
        'transition-colors duration-150 focus-ring hover:border-input',
        'aria-pressed:border-primary aria-pressed:bg-primary-tint',
        'disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-muted-foreground',
        className,
      )}
      {...props}
    >
      <span className='flex min-w-0 flex-1 flex-col'>
        <span className='truncate font-semibold'>{title}</span>
        {meta != null && (
          <span className='truncate text-caption text-muted-foreground'>
            {meta}
          </span>
        )}
      </span>
      {aside != null && (
        <span className='shrink-0 text-small font-medium tabular-nums'>
          {aside}
        </span>
      )}
    </button>
  ),
);
UIOptionCardBase.displayName = 'UIOptionCard';
export const UIOptionCard = memo(UIOptionCardBase);
