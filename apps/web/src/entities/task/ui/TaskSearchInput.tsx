import { UISearchInput } from '@/shared/ui';

export function TaskSearchInput({
  value,
  onValueChange,
  placeholder,
  className,
}: {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly placeholder?: string;
  readonly className?: string;
}) {
  return (
    <UISearchInput
      aria-label={placeholder ?? 'Поиск по названию или ключу'}
      placeholder={placeholder ?? 'Название или ключ'}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      onClear={() => onValueChange('')}
      wrapperClassName={className}
    />
  );
}
