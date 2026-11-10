import type { VariantProps } from 'class-variance-authority';
import { forwardRef, memo, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { iconButtonVariants } from './UIIconButton.variants';

export interface IUIIconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof iconButtonVariants> {
  readonly testId?: string;
  /** Обязательная подпись: без неё кнопка-иконка немая для скринридера. */
  readonly label: string;
}

/**
 * Квадратная или круглая кнопка с иконкой.
 *
 * @example
 * <UIIconButton label="Закрыть" onClick={close}><UIIcons.X /></UIIconButton>
 */
const UIIconButtonBase = forwardRef<HTMLButtonElement, IUIIconButtonProps>(
  ({ className, testId, label, variant, size, shape, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      data-name={testId ? `UIIconButton-${testId}` : 'UIIconButton'}
      className={cn(iconButtonVariants({ variant, size, shape }), className)}
      {...props}
    />
  ),
);
UIIconButtonBase.displayName = 'UIIconButton';
export const UIIconButton = memo(UIIconButtonBase);
