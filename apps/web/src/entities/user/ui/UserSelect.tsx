import type { UserBrief } from '@gwmt/contracts';

import { type IUISelectProps, UISelect } from '@/shared/ui';

import { NOBODY } from '../model/nobody';

/**
 * Выбор человека на роль в задаче. С `optional` первым идёт «Не назначен»
 * (значение — пустая строка), иначе `placeholder` просит выбрать.
 */
export function UserSelect({
  users,
  value,
  onValueChange,
  optional = false,
  placeholder,
  ...props
}: Omit<IUISelectProps, 'onChange' | 'onValueChange' | 'options' | 'value'> & {
  readonly users: readonly UserBrief[];
  readonly value: string;
  readonly onValueChange: (userId: string) => void;
  readonly optional?: boolean;
}) {
  const options = users.map((user) => ({ value: user.id, label: user.name }));
  return (
    <UISelect
      value={value}
      onValueChange={onValueChange}
      options={
        optional
          ? [{ value: NOBODY, label: 'Не назначен' }, ...options]
          : options
      }
      placeholder={optional ? undefined : placeholder}
      {...props}
    />
  );
}
