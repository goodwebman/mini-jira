import { forwardRef, memo, type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { UIIcons, type UIIconComponent } from '@/shared/ui/icons';

/** Приоритеты задач. Совпадают с `TaskPriority` из @gwmt/contracts. */
export type UITaskPriority = 'crit' | 'high' | 'med' | 'low';

const PRIORITY_ICON: Record<UITaskPriority, UIIconComponent> = {
  crit: UIIcons.AlertTriangle,
  high: UIIcons.ArrowUp,
  med: UIIcons.Equal,
  low: UIIcons.ArrowDown,
};

const PRIORITY_COLOR: Record<UITaskPriority, string> = {
  crit: 'text-destructive',
  high: 'text-warning',
  med: 'text-muted-foreground',
  low: 'text-primary-hover',
};

export interface IUIPriorityProps extends HTMLAttributes<HTMLSpanElement> {
  readonly testId?: string;
  readonly priority: UITaskPriority;
  /** Имя приоритета для скринридера, когда текста нет и видна только иконка. */
  readonly label?: string;
}

/**
 * Приоритет задачи: иконка и цвет. Без children показывается только иконка.
 *
 * @example
 * <UIPriority priority="high">{TASK_PRIORITY_LABELS.high}</UIPriority>
 * <UIPriority priority="crit" label="Критичный" />
 */
const UIPriorityBase = forwardRef<HTMLSpanElement, IUIPriorityProps>(
  ({ className, testId, priority, label, children, ...props }, ref) => {
    const Icon = PRIORITY_ICON[priority];

    return (
      <span
        ref={ref}
        data-name={testId ? `UIPriority-${testId}` : 'UIPriority'}
        data-priority={priority}
        className={cn(
          'inline-flex shrink-0 items-center gap-1 text-small font-medium',
          PRIORITY_COLOR[priority],
          className,
        )}
        {...props}
      >
        <Icon className="size-icon-sm" title={children == null ? label : undefined} />
        {children}
      </span>
    );
  },
);
UIPriorityBase.displayName = 'UIPriority';
export const UIPriority = memo(UIPriorityBase);
