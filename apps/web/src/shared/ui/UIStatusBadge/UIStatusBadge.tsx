import { forwardRef, memo, type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { STATUS_DOT_CLASS, STATUS_TINT_CLASS, type UITaskStatus } from './status.styles';

export interface IUIStatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly testId?: string;
  readonly status: UITaskStatus;
}

/**
 * Статус задачи с цветной точкой. Текст передаётся снаружи: подписи статусов живут
 * в контрактах, а не в ките.
 *
 * @example
 * <UIStatusBadge status={task.status}>{TASK_STATUS_LABELS[task.status]}</UIStatusBadge>
 */
const UIStatusBadgeBase = forwardRef<HTMLSpanElement, IUIStatusBadgeProps>(
  ({ className, testId, status, children, ...props }, ref) => (
    <span
      ref={ref}
      data-name={testId ? `UIStatusBadge-${testId}` : 'UIStatusBadge'}
      data-status={status}
      className={cn(
        'inline-flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full px-3 py-1',
        'text-small font-medium text-foreground',
        STATUS_TINT_CLASS[status],
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className={cn('size-[8px] rounded-full', STATUS_DOT_CLASS[status])} />
      {children}
    </span>
  ),
);
UIStatusBadgeBase.displayName = 'UIStatusBadge';
export const UIStatusBadge = memo(UIStatusBadgeBase);
