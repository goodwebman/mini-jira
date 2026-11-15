import {
  type ChangeEvent,
  type SelectHTMLAttributes,
  forwardRef,
  memo,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import type { VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/lib/cn';
import { Portal } from '@/shared/lib/dom';
import {
  useEscape,
  useFloatingPosition,
  useMergedRefs,
  useOutsideClick,
} from '@/shared/lib/hooks';
import { FieldError } from '@/shared/ui/UIField/FieldError';
import { fieldControlVariants } from '@/shared/ui/UIField/field.styles';
import { useFieldControl } from '@/shared/ui/UIField/use-field-control';
import { UIIcons } from '@/shared/ui/icons';

export interface IUISelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface IUISelectProps
  extends
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size'>,
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
 * Нативный контрол формы со скруглённым меню, навигацией с клавиатуры и поиском по букве.
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
      onKeyDown,
      onClick,
      onMouseDown,
      onPointerDown,
      onBlur,
      children,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const control = useFieldControl({ id, error, disabled, ariaDescribedBy });
    const selectRef = useRef<HTMLSelectElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const mergedRef = useMergedRefs(selectRef, ref);
    const menuId = useId();
    const [items, setItems] = useState<readonly HTMLOptionElement[]>([]);
    const [active, setActive] = useState(-1);
    const open = items.length > 0 && !control.disabled;
    const close = () => setItems([]);
    useEscape(close, open);
    useOutsideClick(menuRef, close, { enabled: open, ignoreRefs: [selectRef] });
    useFloatingPosition({
      anchorRef: selectRef,
      floatingRef: menuRef,
      open,
      matchWidth: true,
      gutter: 4,
    });
    useLayoutEffect(() => {
      if (open)
        menuRef.current?.children[active]?.scrollIntoView?.({
          block: 'nearest',
        });
    }, [open, active]);

    const show = () => {
      const select = selectRef.current;
      if (!select || control.disabled) return;
      const choices = [...select.options].filter((option) => !option.hidden);
      setItems(choices);
      setActive(
        Math.max(
          0,
          choices.findIndex((option) => option.selected),
        ),
      );
    };
    const choose = (option: HTMLOptionElement | undefined) => {
      const select = selectRef.current;
      if (!select || !option || option.disabled) return;
      if (select.value !== option.value) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      close();
      select.focus();
    };

    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
      onChange?.(event);
      onValueChange?.(event.target.value);
    };

    // Иначе браузер выберет первую доступную опцию и placeholder не будет виден
    const initialValue = defaultValue ?? (placeholder != null ? '' : undefined);

    return (
      <div className={cn('w-full min-w-0', wrapperClassName)}>
        <div className='relative'>
          <select
            ref={mergedRef}
            id={control.controlId}
            data-name={testId ? `UISelect-${testId}` : 'UISelect'}
            aria-invalid={control.invalid || undefined}
            aria-describedby={control.describedBy}
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-activedescendant={
              open && active >= 0 ? `${menuId}-${String(active)}` : undefined
            }
            disabled={control.disabled}
            value={value}
            defaultValue={value === undefined ? initialValue : undefined}
            onChange={handleChange}
            onPointerDown={(event) => {
              onPointerDown?.(event);
              if (event.defaultPrevented || event.pointerType === 'mouse')
                return;
              event.preventDefault();
              event.currentTarget.focus();
            }}
            onMouseDown={(event) => {
              onMouseDown?.(event);
              if (event.defaultPrevented || event.button !== 0) return;
              event.preventDefault();
              event.currentTarget.focus();
            }}
            onClick={(event) => {
              onClick?.(event);
              if (event.defaultPrevented) return;
              event.preventDefault();
              if (open) close();
              else show();
            }}
            onBlur={(event) => {
              onBlur?.(event);
              close();
            }}
            onKeyDown={(event) => {
              onKeyDown?.(event);
              if (event.defaultPrevented) return;
              if (event.key === 'Tab') {
                close();
                return;
              }
              if (event.key === 'Escape' && open) {
                event.preventDefault();
                close();
                return;
              }
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (open) choose(items[active]);
                else show();
                return;
              }
              if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                if (!open) {
                  show();
                  return;
                }
                const step =
                  event.key === 'ArrowUp' || event.key === 'End' ? -1 : 1;
                let next = active + step;
                if (event.key === 'Home') next = 0;
                if (event.key === 'End') next = items.length - 1;
                while (
                  next >= 0 &&
                  next < items.length &&
                  items[next]?.disabled
                )
                  next += step;
                if (next >= 0 && next < items.length) {
                  setActive(next);
                  menuRef.current?.children[next]?.scrollIntoView?.({
                    block: 'nearest',
                  });
                }
              } else if (
                open &&
                event.key.length === 1 &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey
              ) {
                event.preventDefault();
                const next = items.findIndex(
                  (option, index) =>
                    index > active &&
                    !option.disabled &&
                    option.label
                      .toLocaleLowerCase()
                      .startsWith(event.key.toLocaleLowerCase()),
                );
                const match =
                  next >= 0
                    ? next
                    : items.findIndex(
                        (option) =>
                          !option.disabled &&
                          option.label
                            .toLocaleLowerCase()
                            .startsWith(event.key.toLocaleLowerCase()),
                      );
                if (match >= 0) {
                  setActive(match);
                  menuRef.current?.children[match]?.scrollIntoView?.({
                    block: 'nearest',
                  });
                }
              }
            }}
            className={cn(
              fieldControlVariants({ size }),
              'cursor-pointer appearance-none truncate pl-3 pr-[calc(var(--icon-md)+16px)]',
              "has-[option[value='']:checked]:text-muted-foreground",
              className,
            )}
            {...props}
          >
            {placeholder != null && (
              <option value='' disabled hidden>
                {placeholder}
              </option>
            )}
            {options?.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
            {children}
          </select>
          <UIIcons.ChevronDown className='pointer-events-none absolute right-2 top-1/2 size-icon -translate-y-1/2 text-foreground' />
          {open && (
            <Portal>
              <div
                ref={menuRef}
                id={menuId}
                role='listbox'
                aria-label={props['aria-label'] ?? 'Варианты'}
                className='invisible fixed left-0 top-0 z-[70] max-h-[min(320px,50dvh)] w-[var(--anchor-width)] overflow-y-auto rounded-block border border-border bg-surface p-1 shadow-popover scrollbar-thin'
              >
                {items.map((option, index) => (
                  <div
                    key={option.value}
                    id={`${menuId}-${String(index)}`}
                    role='option'
                    aria-selected={option.selected}
                    aria-disabled={option.disabled || undefined}
                    onMouseDown={(event) => event.preventDefault()}
                    onPointerMove={() => {
                      if (!option.disabled) setActive(index);
                    }}
                    onClick={() => choose(option)}
                    className={cn(
                      'flex min-h-control cursor-pointer items-center gap-2 rounded-control px-3 py-2 text-field text-foreground',
                      index === active && 'bg-primary-tint',
                      option.selected && 'font-medium text-primary',
                      option.disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <span className='min-w-0 flex-1 break-words'>
                      {option.label}
                    </span>
                    {option.selected && (
                      <UIIcons.Check className='size-icon shrink-0' />
                    )}
                  </div>
                ))}
              </div>
            </Portal>
          )}
        </div>
        {control.errorText && (
          <FieldError id={control.errorId}>{control.errorText}</FieldError>
        )}
      </div>
    );
  },
);
UISelectBase.displayName = 'UISelect';
export const UISelect = memo(UISelectBase);
