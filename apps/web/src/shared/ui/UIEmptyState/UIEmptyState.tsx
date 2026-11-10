import { forwardRef, memo, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface IUIEmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  readonly testId?: string;
  readonly title: ReactNode;
  /** Пояснение под заголовком. */
  readonly description?: ReactNode;
  /** Иконка над текстом. */
  readonly icon?: ReactNode;
  /** Действие, обычно UIButton. */
  readonly action?: ReactNode;
  /** Показать на поверхности блока, с рамкой. */
  readonly boxed?: boolean;
}

/**
 * Пустое состояние: нет задач, ничего не нашлось.
 *
 * @example
 * <UIEmptyState boxed title="Задач по этим условиям нет" />
 */
const UIEmptyStateBase = forwardRef<HTMLDivElement, IUIEmptyStateProps>(
  ({ className, testId, title, description, icon, action, boxed = false, ...props }, ref) => (
    <div
      ref={ref}
      data-name={testId ? `UIEmptyState-${testId}` : 'UIEmptyState'}
      className={cn(
        'flex flex-col items-center gap-2 px-4 py-8 text-center text-muted-foreground',
        boxed && 'rounded-block border border-border bg-surface',
        className,
      )}
      {...props}
    >
      {icon != null && <div className="[&_svg]:size-[32px]">{icon}</div>}
      <p className="m-0">{title}</p>
      {description != null && <p className="m-0 text-small">{description}</p>}
      {action != null && <div className="mt-2">{action}</div>}
    </div>
  ),
);
UIEmptyStateBase.displayName = 'UIEmptyState';
export const UIEmptyState = memo(UIEmptyStateBase);
