import type { UserBrief } from '@gwmt/contracts';

import { UIChip } from '@/shared/ui';

import { firstName } from '../model/user-view';
import { UserAvatar } from './UserAvatar';

/** Чип человека: фильтр доски по участнику и выбор участников новой доски. */
export function UserChip({
  user,
  pressed,
  onToggle,
  disabled,
}: {
  readonly user: Pick<UserBrief, 'colorIndex' | 'name'>;
  readonly pressed: boolean;
  readonly onToggle: () => void;
  readonly disabled?: boolean;
}) {
  return (
    <UIChip
      pressed={pressed}
      onClick={onToggle}
      disabled={disabled}
      avatar={<UserAvatar user={user} size='xs' />}
      title={user.name}
    >
      {firstName(user.name)}
    </UIChip>
  );
}
