import { forwardRef, memo } from 'react';

import { cn } from '@/shared/lib/cn';
import { useFieldContext } from '@/shared/ui/UIField/field-context';
import { UIIconButton } from '@/shared/ui/UIIconButton';
import { type IUIInputProps, UIInput } from '@/shared/ui/UIInput';
import { UIIcons } from '@/shared/ui/icons';

export interface IUISearchInputProps extends Omit<
  IUIInputProps,
  'leftSlot' | 'rightSlot' | 'type'
> {
  /** Если передан и поле не пустое, справа появляется кнопка очистки. */
  readonly onClear?: () => void;
  /** Подпись кнопки очистки для скринридеров. */
  readonly clearLabel?: string;
}

/**
 * Поле поиска с иконкой. Без внешней подписи получает `aria-label="Поиск"`.
 *
 * @example
 * <UISearchInput value={query} onChange={handleChange} onClear={() => setQuery('')} />
 */
const UISearchInputBase = forwardRef<HTMLInputElement, IUISearchInputProps>(
  (
    {
      className,
      testId,
      onClear,
      clearLabel = 'Очистить поиск',
      value,
      disabled,
      ...props
    },
    ref,
  ) => {
    const field = useFieldContext();
    const canClear =
      onClear != null && value != null && value !== '' && !disabled;

    return (
      <UIInput
        ref={ref}
        type='search'
        // aria-label перекрыл бы подпись из UIField
        aria-label={field ? undefined : 'Поиск'}
        testId={testId ? `search-${testId}` : 'search'}
        value={value}
        disabled={disabled}
        leftSlot={<UIIcons.Search className='size-icon-lg' />}
        rightSlot={
          canClear ? (
            <UIIconButton
              label={clearLabel}
              variant='muted'
              size='xs'
              onClick={onClear}
            >
              <UIIcons.X />
            </UIIconButton>
          ) : undefined
        }
        className={cn(
          'border-border-strong bg-background [&::-webkit-search-cancel-button]:appearance-none',
          className,
        )}
        {...props}
      />
    );
  },
);
UISearchInputBase.displayName = 'UISearchInput';
export const UISearchInput = memo(UISearchInputBase);
