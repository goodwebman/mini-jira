import type { BoardRole } from '@gwmt/contracts';

import { type IUISelectProps, UISelect } from '@/shared/ui';

import { BOARD_ROLE_OPTIONS, isBoardRole } from '../model/board-role';

export function BoardRoleSelect({
  value,
  onValueChange,
  ...props
}: Omit<IUISelectProps, 'onChange' | 'onValueChange' | 'options' | 'value'> & {
  readonly value: BoardRole;
  readonly onValueChange: (role: BoardRole) => void;
}) {
  return (
    <UISelect
      value={value}
      options={BOARD_ROLE_OPTIONS}
      onValueChange={(next) => {
        if (isBoardRole(next)) onValueChange(next);
      }}
      {...props}
    />
  );
}
