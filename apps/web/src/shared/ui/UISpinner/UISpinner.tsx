import { forwardRef, memo } from 'react';
import { cn } from '@/shared/lib/cn';
import { UIIcons, type IUIIconProps } from '@/shared/ui/icons';

export interface IUISpinnerProps extends IUIIconProps {
  readonly testId?: string;
}

/** Индикатор загрузки. Размер задаётся классом: `size-icon-sm`, `size-[32px]`. */
const UISpinnerBase = forwardRef<SVGSVGElement, IUISpinnerProps>(
  ({ className, testId, 'aria-label': ariaLabel = 'Загрузка', ...props }, ref) => (
    <UIIcons.Spinner
      ref={ref}
      role="status"
      aria-label={ariaLabel}
      data-name={testId ? `UISpinner-${testId}` : 'UISpinner'}
      className={cn('size-icon-lg animate-spin text-muted-foreground', className)}
      {...props}
    />
  ),
);
UISpinnerBase.displayName = 'UISpinner';
export const UISpinner = memo(UISpinnerBase);
