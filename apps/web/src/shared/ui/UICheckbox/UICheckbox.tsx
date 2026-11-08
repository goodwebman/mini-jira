import {
  forwardRef,
  memo,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/cn';
import { useIsomorphicLayoutEffect, useMergedRefs } from '../../lib/hooks';
import { UIIcons } from '../icons';

export interface IUICheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  readonly testId?: string;
  /** Текст рядом с чекбоксом. Без него задай `aria-label`. */
  readonly label?: ReactNode;
  /** Частично выбранное состояние («выбраны не все»). */
  readonly indeterminate?: boolean;
  /** То же, что `onChange`, но сразу с `checked`. */
  readonly onCheckedChange?: (checked: boolean) => void;
}

/**
 * Чекбокс на нативном `<input>`: работает в формах и с react-hook-form.
 * `className` применяется к корневому элементу.
 */
const UICheckboxBase = forwardRef<HTMLInputElement, IUICheckboxProps>(
  (
    { className, testId, label, indeterminate = false, onCheckedChange, onChange, disabled, ...props },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const mergedRef = useMergedRefs(inputRef, ref);

    useIsomorphicLayoutEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      // Браузер сбрасывает indeterminate при клике, а проп мог не измениться
      event.currentTarget.indeterminate = indeterminate;
      onChange?.(event);
      onCheckedChange?.(event.currentTarget.checked);
    };

    // Вложенный <label> в <label> невалиден, поэтому без текста обёртка — span
    const Root = label != null ? 'label' : 'span';

    return (
      <Root
        data-name={testId ? `UICheckbox-${testId}` : 'UICheckbox'}
        className={cn(
          'inline-flex items-center gap-2 text-body text-foreground',
          disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer',
          className,
        )}
      >
        <span className="relative inline-flex size-[18px] shrink-0">
          <input
            ref={mergedRef}
            type="checkbox"
            disabled={disabled}
            onChange={handleChange}
            className={cn(
              'peer m-0 size-full cursor-[inherit] appearance-none rounded-[5px] border border-input bg-surface',
              'transition-colors duration-150 focus-ring',
              'checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary',
              'aria-invalid:border-destructive',
              'disabled:border-border disabled:bg-background',
              'disabled:checked:border-border disabled:checked:bg-border',
              'disabled:indeterminate:border-border disabled:indeterminate:bg-border',
            )}
            {...props}
          />
          {indeterminate ? (
            <UIIcons.Minus
              strokeWidth={3}
              className="pointer-events-none absolute inset-0 m-auto size-[12px] text-primary-foreground opacity-0 peer-indeterminate:opacity-100"
            />
          ) : (
            <UIIcons.Check
              strokeWidth={3}
              className="pointer-events-none absolute inset-0 m-auto size-[12px] text-primary-foreground opacity-0 peer-checked:opacity-100"
            />
          )}
        </span>
        {label != null && <span>{label}</span>}
      </Root>
    );
  },
);
UICheckboxBase.displayName = 'UICheckbox';
export const UICheckbox = memo(UICheckboxBase);
