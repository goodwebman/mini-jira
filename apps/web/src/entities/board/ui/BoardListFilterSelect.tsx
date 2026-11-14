import { UISelect } from '@/shared/ui';

export type BoardListFilter = 'all' | 'favorite';

export function BoardListFilterSelect({
  value,
  onValueChange,
}: {
  readonly value: BoardListFilter;
  readonly onValueChange: (value: BoardListFilter) => void;
}) {
  return (
    <UISelect
      aria-label='Какие доски показать'
      value={value}
      options={[
        { value: 'all', label: 'Все доски' },
        { value: 'favorite', label: 'Избранные' },
      ]}
      onValueChange={(next) =>
        onValueChange(next === 'favorite' ? 'favorite' : 'all')
      }
      wrapperClassName='min-w-[140px] flex-[0_1_220px]'
    />
  );
}
