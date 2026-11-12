import { type HTMLAttributes, type ReactNode, forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { UICard } from '@/shared/ui/UICard';
import { UIProgress } from '@/shared/ui/UIProgress';

export interface IUIStatProps extends HTMLAttributes<HTMLDivElement> {
  readonly testId?: string;
  readonly label: ReactNode;
  /** Крупное значение. */
  readonly value: ReactNode;
  /** Подпись под значением. */
  readonly sub?: ReactNode;
  /** Процент для полосы прогресса между значением и подписью. */
  readonly progress?: number;
}

/**
 * Плитка метрики KPI.
 *
 * @example
 * <UIStat label="Выполнено" value="42 SP" sub="из 64 SP · 65%" progress={65} />
 */
const UIStatBase = forwardRef<HTMLDivElement, IUIStatProps>(
  ({ className, testId, label, value, sub, progress, ...props }, ref) => (
    <UICard
      ref={ref}
      padding='sm'
      testId={testId ? `stat-${testId}` : 'stat'}
      className={cn('gap-1', className)}
      {...props}
    >
      <p className='m-0 text-small font-medium text-muted-foreground'>
        {label}
      </p>
      <div className='text-metric font-semibold tracking-display tabular-nums'>
        {value}
      </div>
      {progress != null && (
        <UIProgress
          value={progress}
          size='sm'
          track='border'
          color='var(--status-done)'
          className='my-[2px]'
        />
      )}
      {sub != null && (
        <div className='text-caption text-muted-foreground'>{sub}</div>
      )}
    </UICard>
  ),
);
UIStatBase.displayName = 'UIStat';
export const UIStat = memo(UIStatBase);
