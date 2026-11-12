import {
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  memo,
} from 'react';

import { cn } from '@/shared/lib/cn';

export interface IUISwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type'
> {
  readonly testId?: string;
  /** Текст рядом с переключателем. Без него задай `aria-label`. */
  readonly label?: ReactNode;
  /** То же, что `onChange`, но сразу с `checked`. */
  readonly onCheckedChange?: (checked: boolean) => void;
}

/**
 * Переключатель на нативном `<input role="switch">`: работает в формах и с
 * react-hook-form. `className` применяется к корневому элементу.
 */
const UISwitchBase = forwardRef<HTMLInputElement, IUISwitchProps>(
  (
    { className, testId, label, onCheckedChange, onChange, disabled, ...props },
    ref,
  ) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
      onCheckedChange?.(event.currentTarget.checked);
    };

    const Root = label != null ? 'label' : 'span';

    return (
      <Root
        data-name={testId ? `UISwitch-${testId}` : 'UISwitch'}
        className={cn(
          'inline-flex items-center gap-2 text-body text-foreground',
          disabled
            ? 'cursor-not-allowed text-muted-foreground'
            : 'cursor-pointer',
          className,
        )}
      >
        <span className='relative inline-flex h-[20px] w-[36px] shrink-0'>
          <input
            ref={ref}
            type='checkbox'
            role='switch'
            disabled={disabled}
            onChange={handleChange}
            className={cn(
              'peer m-0 size-full cursor-[inherit] appearance-none rounded-full bg-input',
              'transition-colors duration-200 focus-ring',
              'checked:bg-primary disabled:bg-border disabled:checked:bg-border',
            )}
            {...props}
          />
          <span
            aria-hidden='true'
            className='pointer-events-none absolute left-[2px] top-[2px] size-[16px] rounded-full bg-surface transition-transform duration-200 peer-checked:translate-x-[16px]'
          />
        </span>
        {label != null && <span>{label}</span>}
      </Root>
    );
  },
);
UISwitchBase.displayName = 'UISwitch';
export const UISwitch = memo(UISwitchBase);
