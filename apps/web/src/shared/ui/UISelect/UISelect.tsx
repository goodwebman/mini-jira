import type { VariantProps } from 'class-variance-authority';
import { forwardRef, memo, type ChangeEvent, type SelectHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { UIIcons } from '@/shared/ui/icons';
import { FieldError } from '@/shared/ui/UIField/FieldError';
import { fieldControlVariants } from '@/shared/ui/UIField/field.styles';
import { useFieldControl } from '@/shared/ui/UIField/use-field-control';

export interface IUISelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface IUISelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'multiple'>,
    VariantProps<typeof fieldControlVariants> {
  readonly testId?: string;
  /** Список опций. Можно вместо него передать `<option>` через children. */
  readonly options?: readonly IUISelectOption[];
  /** Текст, пока ничего не выбрано. */
  readonly placeholder?: string;
  /** Ошибка: строка показывается под полем, `true` — только красная рамка. */
  readonly error?: boolean | string;
  /** То же, что `onChange`, но сразу со значением. */
  readonly onValueChange?: (value: string) => void;
  /** Класс внешней обёртки. */
  readonly wrapperClassName?: string;
}

/**
 * Выпадающий список на нативном `<select>`, как в дизайне: системный пикер на телефоне,
 * клавиатура и работа в формах достаются бесплатно.
 *
 * @example
 * <UISelect value={role} onValueChange={setRole} options={roleOptions} placeholder="Роль" />
 */
const UISelectBase = forwardRef<HTMLSelectElement, IUISelectProps>(
  (
    {
      className,
      wrapperClassName,
      testId,
      size,
      options,
      placeholder,
      error,
      disabled,
      id,
      value,
      defaultValue,
      onChange,
      onValueChange,
      children,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const control = useFieldControl({ id, error, disabled, ariaDescribedBy });

    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
      onChange?.(event);
      onValueChange?.(event.target.value);
    };

    // Иначе браузер выберет первую доступную опцию и placeholder не будет виден
    const initialValue = defaultValue ?? (placeholder != null ? '' : undefined);

    return (
      <div className={cn('w-full min-w-0', wrapperClassName)}>
        <div className="relative">
          <select
            ref={ref}
            id={control.controlId}
            data-name={testId ? `UISelect-${testId}` : 'UISelect'}
            aria-invalid={control.invalid || undefined}
            aria-describedby={control.describedBy}
            disabled={control.disabled}
            value={value}
            defaultValue={value === undefined ? initialValue : undefined}
            onChange={handleChange}
            className={cn(
              fieldControlVariants({ size }),
              'cursor-pointer appearance-none truncate pl-3 pr-[calc(var(--icon-md)+16px)]',
              "has-[option[value='']:checked]:text-muted-foreground",
              className,
            )}
            {...props}
          >
            {placeholder != null && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {options?.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
            {children}
          </select>
          <UIIcons.ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-icon -translate-y-1/2 text-foreground" />
        </div>
        {control.errorText && <FieldError id={control.errorId}>{control.errorText}</FieldError>}
      </div>
    );
  },
);
UISelectBase.displayName = 'UISelect';
export const UISelect = memo(UISelectBase);
