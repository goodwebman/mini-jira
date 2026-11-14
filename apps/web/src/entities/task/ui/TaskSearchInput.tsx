import { UISearchInput } from '@/shared/ui';

export function TaskSearchInput({
  value,
  onValueChange,
  placeholder = 'Поиск по названию или ключу',
  className,
}: {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly placeholder?: string;
  readonly className?: string;
}) {
  return (
    <UISearchInput
      aria-label={placeholder}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      onClear={() => onValueChange('')}
      wrapperClassName={className}
    />
  );
}
