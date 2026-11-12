import {
  type CSSProperties,
  type HTMLAttributes,
  forwardRef,
  memo,
} from 'react';

import { type VariantProps, cva } from 'class-variance-authority';

import { cn } from '@/shared/lib/cn';

const trackVariants = cva('w-full overflow-hidden rounded-full', {
  variants: {
    size: {
      xs: 'h-[4px]',
      sm: 'h-[6px]',
      md: 'h-[8px]',
    },
    track: {
      muted: 'bg-muted',
      border: 'bg-border',
    },
  },
  defaultVariants: { size: 'md', track: 'muted' },
});

export interface IUIProgressProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof trackVariants> {
  readonly testId?: string;
  /** Текущее значение. */
  readonly value: number;
  /** Максимум (по умолчанию 100). */
  readonly max?: number;
  /** Цвет заполнения: токен (`var(--status-done)`) или любой CSS-цвет. */
  readonly color?: string;
  /** Подпись для скринридера. */
  readonly ariaLabel?: string;
}

/** Полоса прогресса. Значение за пределами 0…max не ломает ширину. */
const UIProgressBase = forwardRef<HTMLDivElement, IUIProgressProps>(
  (
    {
      className,
      testId,
      value,
      max = 100,
      size,
      track,
      color = 'var(--primary)',
      ariaLabel = 'Прогресс',
      ...props
    },
    ref,
  ) => {
    const safeMax = max > 0 ? max : 100;
    const clamped = Math.min(
      safeMax,
      Math.max(0, Number.isFinite(value) ? value : 0),
    );
    const indicator: CSSProperties = {
      width: `${String((clamped / safeMax) * 100)}%`,
      backgroundColor: color,
    };

    return (
      <div
        ref={ref}
        role='progressbar'
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        data-name={testId ? `UIProgress-${testId}` : 'UIProgress'}
        className={cn(trackVariants({ size, track }), className)}
        {...props}
      >
        <div
          className='h-full rounded-full transition-[width] duration-300 ease-out'
          style={indicator}
        />
      </div>
    );
  },
);
UIProgressBase.displayName = 'UIProgress';
export const UIProgress = memo(UIProgressBase);
