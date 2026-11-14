import { UISearchInput } from '@/shared/ui';

export function BoardSearchInput({
  value,
  onValueChange,
}: {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
}) {
  return (
    <UISearchInput
      aria-label='Поиск по названию'
      placeholder='Поиск по названию'
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      onClear={() => onValueChange('')}
      wrapperClassName='min-w-0 flex-[1_1_200px]'
    />
  );
}
