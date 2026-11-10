import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, memo, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { UIIcons, type UIIconComponent } from '@/shared/ui/icons';

const alertVariants = cva(
  "flex items-center gap-2 rounded-control px-3 py-2 text-small font-medium [&_svg:not([class*='size-'])]:size-icon",
  {
    variants: {
      tone: {
        warning: 'bg-warning-tint text-warning-emphasis',
        info: 'bg-primary-tint text-primary-hover',
        danger: 'bg-destructive-tint text-destructive',
        success: 'bg-success-tint text-success',
      },
    },
    defaultVariants: { tone: 'warning' },
  },
);

type AlertTone = NonNullable<VariantProps<typeof alertVariants>['tone']>;

const DEFAULT_ICON: Record<AlertTone, UIIconComponent> = {
  warning: UIIcons.AlertTriangle,
  info: UIIcons.CircleAlert,
  danger: UIIcons.CircleAlert,
  success: UIIcons.CircleCheck,
};

export interface IUIAlertProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  readonly testId?: string;
  /** Своя иконка. `null` — без иконки. */
  readonly icon?: ReactNode;
  /** Действие справа. */
  readonly action?: ReactNode;
}

/**
 * Плашка-уведомление внутри страницы.
 *
 * @example
 * <UIAlert icon={<UIIcons.Eye />}>Вы гость на этой доске: можно только смотреть</UIAlert>
 */
const UIAlertBase = forwardRef<HTMLDivElement, IUIAlertProps>(
  ({ className, testId, tone, icon, action, role, children, ...props }, ref) => {
    const resolvedTone = tone ?? 'warning';
    const DefaultIcon = DEFAULT_ICON[resolvedTone];

    return (
      <div
        ref={ref}
        role={role ?? (resolvedTone === 'danger' ? 'alert' : 'status')}
        data-name={testId ? `UIAlert-${testId}` : 'UIAlert'}
        className={cn(alertVariants({ tone: resolvedTone }), className)}
        {...props}
      >
        {icon === undefined ? <DefaultIcon /> : icon}
        <span className="min-w-0 flex-1">{children}</span>
        {action}
      </div>
    );
  },
);
UIAlertBase.displayName = 'UIAlert';
export const UIAlert = memo(UIAlertBase);
