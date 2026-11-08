import {
  forwardRef,
  memo,
  type ForwardedRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
} from 'react';
import { cn } from '../../lib/cn';

export interface IUISegmentedOption<T extends string> {
  readonly value: T;
  readonly label: ReactNode;
  readonly disabled?: boolean;
}

export interface IUISegmentedProps<T extends string>
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  readonly testId?: string;
  readonly options: readonly IUISegmentedOption<T>[];
  readonly value: T | undefined;
  readonly onValueChange: (value: T) => void;
}

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);
const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp']);

function UISegmentedInner<T extends string>(
  { className, testId, options, value, onValueChange, ...props }: IUISegmentedProps<T>,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const enabled = options.filter((option) => !option.disabled);
  // Tab должен попадать в группу, даже если ничего не выбрано
  const tabStop = enabled.some((option) => option.value === value) ? value : enabled[0]?.value;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: T) => {
    const index = enabled.findIndex((option) => option.value === current);
    let next: number;
    if (NEXT_KEYS.has(event.key)) next = (index + 1) % enabled.length;
    else if (PREV_KEYS.has(event.key)) next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    else return;

    event.preventDefault();
    const target = enabled[next];
    onValueChange(target.value);
    const radios = event.currentTarget
      .closest('[role="radiogroup"]')
      ?.querySelectorAll<HTMLElement>('[role="radio"]');
    radios?.[options.indexOf(target)]?.focus();
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      data-name={testId ? `UISegmented-${testId}` : 'UISegmented'}
      className={cn('flex flex-wrap gap-1', className)}
      {...props}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={option.value === tabStop ? 0 : -1}
            disabled={option.disabled}
            onClick={() => {
              onValueChange(option.value);
            }}
            onKeyDown={(event) => {
              handleKeyDown(event, option.value);
            }}
            className={cn(
              'h-control min-w-[44px] cursor-pointer rounded-control border border-border-strong bg-surface px-3',
              'text-body font-medium text-foreground transition-colors duration-150 focus-ring hover:bg-muted',
              // Без смены жирности: она меняет ширину текста, и соседние сегменты сдвигаются
              'aria-checked:border-primary aria-checked:bg-primary-tint aria-checked:text-primary-hover',
              'disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-muted-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Выбор одного значения из нескольких кнопками. Семантика radiogroup: стрелки, Home, End.
 *
 * @example
 * <UISegmented aria-label="Тип связи" options={linkTypes} value={type} onValueChange={setType} />
 */
export const UISegmented = memo(forwardRef(UISegmentedInner)) as <T extends string>(
  props: IUISegmentedProps<T> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;
