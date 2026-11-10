import type { VariantProps } from 'class-variance-authority';
import { forwardRef, memo, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { FieldError } from '@/shared/ui/UIField/FieldError';
import { fieldControlVariants } from '@/shared/ui/UIField/field.styles';
import { useFieldControl } from '@/shared/ui/UIField/use-field-control';

export interface IUIInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, VariantProps<typeof fieldControlVariants> {
  readonly testId?: string;
  /** Ошибка: строка показывается под полем, `true` — только красная рамка. */
  readonly error?: boolean | string;
  /** Контент слева (иконка): не перехватывает клики. */
  readonly leftSlot?: ReactNode;
  /** Контент справа (кнопка очистки, спиннер): интерактивный. */
  readonly rightSlot?: ReactNode;
  /** Класс внешней обёртки: ширина и расположение поля в раскладке. */
  readonly wrapperClassName?: string;
}

/**
 * Однострочное поле ввода. Поддерживает нативные атрибуты и react-hook-form (`ref`),
 * показывает ошибку и связывается с UIField, если лежит внутри него.
 */
const UIInputBase = forwardRef<HTMLInputElement, IUIInputProps>(
  (
    {
      className,
      wrapperClassName,
      testId,
      size,
      error,
      leftSlot,
      rightSlot,
      disabled,
      id,
      type = 'text',
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const control = useFieldControl({ id, error, disabled, ariaDescribedBy });

    return (
      <div className={cn('w-full min-w-0', wrapperClassName)}>
        <div className="relative">
          {leftSlot != null && (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              {leftSlot}
            </div>
          )}
          <input
            ref={ref}
            id={control.controlId}
            type={type}
            data-name={testId ? `UIInput-${testId}` : 'UIInput'}
            aria-invalid={control.invalid || undefined}
            aria-describedby={control.describedBy}
            disabled={control.disabled}
            className={cn(
              fieldControlVariants({ size }),
              'px-3',
              leftSlot != null && 'pl-[calc(var(--icon-lg)+20px)]',
              rightSlot != null && 'pr-[calc(var(--control-md)+4px)]',
              className,
            )}
            {...props}
          />
          {rightSlot != null && (
            <div className="absolute inset-y-0 right-1 flex items-center">{rightSlot}</div>
          )}
        </div>
        {control.errorText && <FieldError id={control.errorId}>{control.errorText}</FieldError>}
      </div>
    );
  },
);
UIInputBase.displayName = 'UIInput';
export const UIInput = memo(UIInputBase);
