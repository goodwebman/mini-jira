import { forwardRef, memo, type LabelHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface IUILabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  readonly testId?: string;
  /** Показать пометку «· необязательно» после текста. */
  readonly optional?: boolean;
}

/** Подпись поля формы. */
const UILabelBase = forwardRef<HTMLLabelElement, IUILabelProps>(
  ({ className, testId, optional = false, children, ...props }, ref) => (
    <label
      ref={ref}
      data-name={testId ? `UILabel-${testId}` : 'UILabel'}
      className={cn('text-body font-medium text-foreground', className)}
      {...props}
    >
      {children}
      {optional && <span className="font-normal text-muted-foreground"> · необязательно</span>}
    </label>
  ),
);
UILabelBase.displayName = 'UILabel';
export const UILabel = memo(UILabelBase);
