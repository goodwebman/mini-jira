import type { VariantProps } from 'class-variance-authority';
import { forwardRef, memo, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { UIIcons } from '../icons';
import { buttonVariants } from './UIButton.variants';

/**
 * # Интерфейс пропсов для компонента UIButton
 * @interface IUIButtonProps
 * @extends {ButtonHTMLAttributes<HTMLButtonElement>}
 */
export interface IUIButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** # Суффикс для data-name (UIButton-<testId>), упрощает поиск в тестах и отладке HTML */
  readonly testId?: string;
  /** # Состояние загрузки: блокирует клики, добавляет спиннер и aria-busy */
  readonly loading?: boolean;
}

/**
 * Универсальная кнопка для основных действий в интерфейсе.
 *
 * @example
 * <UIButton onClick={save}>Сохранить</UIButton>
 * <UIButton variant="secondary" loading>Отправка…</UIButton>
 */
const UIButtonBase = forwardRef<HTMLButtonElement, IUIButtonProps>(
  (
    { className, variant, size, testId, loading = false, disabled, type = 'button', children, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      data-name={testId ? `UIButton-${testId}` : 'UIButton'}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && <UIIcons.Spinner data-name="UIButton-spinner" className="size-icon-sm animate-spin" />}
      {children}
    </button>
  ),
);
UIButtonBase.displayName = 'UIButton';
export const UIButton = memo(UIButtonBase);
