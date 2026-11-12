import {
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  memo,
  useId,
  useMemo,
} from 'react';

import { cn } from '@/shared/lib/cn';
import { UILabel } from '@/shared/ui/UILabel';

import { FieldError } from './FieldError';
import { FieldContext } from './field-context';

export interface IUIFieldProps extends HTMLAttributes<HTMLDivElement> {
  readonly testId?: string;
  /** Подпись поля. */
  readonly label?: ReactNode;
  /** Контент справа от подписи, например ссылка «Забыли пароль?». */
  readonly labelAside?: ReactNode;
  /** Пометка «· необязательно». */
  readonly optional?: boolean;
  /** Подсказка под полем. */
  readonly hint?: ReactNode;
  /** Ошибка: строка показывается под полем, `true` — только красная рамка. */
  readonly error?: boolean | string;
  /** id контрола; по умолчанию генерируется. */
  readonly controlId?: string;
  /** Отключить вложенный контрол. */
  readonly disabled?: boolean;
}

/**
 * Обёртка поля формы: подпись, контрол, подсказка, ошибка. Сама связывает их через
 * id и aria-атрибуты с вложенными UIInput, UISelect, UITextarea, UISearchInput.
 *
 * @example
 * <UIField label="Email" error={errors.email}>
 *   <UIInput type="email" {...register('email')} />
 * </UIField>
 */
const UIFieldBase = forwardRef<HTMLDivElement, IUIFieldProps>(
  (
    {
      className,
      testId,
      label,
      labelAside,
      optional,
      hint,
      error,
      controlId,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = controlId ?? generatedId;
    const invalid = error != null && error !== false && error !== '';
    const hintId = hint != null ? `${id}-hint` : undefined;
    const errorText =
      typeof error === 'string' && error.length > 0 ? error : undefined;
    const errorId = errorText ? `${id}-error` : undefined;
    const describedBy =
      [hintId, errorId].filter(Boolean).join(' ') || undefined;

    const context = useMemo(
      () => ({ controlId: id, describedBy, invalid, disabled }),
      [id, describedBy, invalid, disabled],
    );

    return (
      <div
        ref={ref}
        data-name={testId ? `UIField-${testId}` : 'UIField'}
        className={cn('flex min-w-0 flex-col gap-1', className)}
        {...props}
      >
        {label != null && (
          <div className='flex items-baseline justify-between gap-3'>
            <UILabel htmlFor={id} optional={optional}>
              {label}
            </UILabel>
            {labelAside}
          </div>
        )}
        <FieldContext.Provider value={context}>
          {children}
        </FieldContext.Provider>
        {hint != null && (
          <span id={hintId} className='text-small text-muted-foreground'>
            {hint}
          </span>
        )}
        {errorText && (
          <FieldError id={errorId} className='mt-0'>
            {errorText}
          </FieldError>
        )}
      </div>
    );
  },
);
UIFieldBase.displayName = 'UIField';
export const UIField = memo(UIFieldBase);
