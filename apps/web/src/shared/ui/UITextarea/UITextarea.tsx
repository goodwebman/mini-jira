import {
  type ChangeEvent,
  type TextareaHTMLAttributes,
  forwardRef,
  memo,
  useState,
} from 'react';

import { cn } from '@/shared/lib/cn';
import { FieldError } from '@/shared/ui/UIField/FieldError';
import { fieldControlVariants } from '@/shared/ui/UIField/field.styles';
import { useFieldControl } from '@/shared/ui/UIField/use-field-control';

export interface IUITextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly testId?: string;
  /** Ошибка: строка показывается под полем, `true` — только красная рамка. */
  readonly error?: boolean | string;
  /** Класс внешней обёртки. */
  readonly wrapperClassName?: string;
}

/**
 * Многострочное поле. Если задан `maxLength`, под полем показывается счётчик символов.
 */
const UITextareaBase = forwardRef<HTMLTextAreaElement, IUITextareaProps>(
  (
    {
      className,
      wrapperClassName,
      testId,
      error,
      disabled,
      id,
      rows = 3,
      maxLength,
      value,
      defaultValue,
      onChange,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const control = useFieldControl({ id, error, disabled, ariaDescribedBy });
    const [uncontrolledLength, setUncontrolledLength] = useState(() =>
      typeof defaultValue === 'string' ? defaultValue.length : 0,
    );
    const length =
      typeof value === 'string' ? value.length : uncontrolledLength;

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      setUncontrolledLength(event.target.value.length);
      onChange?.(event);
    };

    return (
      <div className={cn('w-full min-w-0', wrapperClassName)}>
        <textarea
          ref={ref}
          id={control.controlId}
          rows={rows}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          data-name={testId ? `UITextarea-${testId}` : 'UITextarea'}
          aria-invalid={control.invalid || undefined}
          aria-describedby={control.describedBy}
          disabled={control.disabled}
          className={cn(
            fieldControlVariants({ size: null }),
            'max-h-textarea-max min-h-textarea-min resize-y px-3 py-2 scrollbar-thin',
            className,
          )}
          {...props}
        />
        {(control.errorText || maxLength != null) && (
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              {control.errorText && (
                <FieldError id={control.errorId}>
                  {control.errorText}
                </FieldError>
              )}
            </div>
            {maxLength != null && (
              <span className='mt-1 shrink-0 text-small text-muted-foreground tabular-nums'>
                {length}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);
UITextareaBase.displayName = 'UITextarea';
export const UITextarea = memo(UITextareaBase);
