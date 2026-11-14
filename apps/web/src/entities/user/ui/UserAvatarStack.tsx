import { UIAvatar } from '@/shared/ui';

import { UserAvatar } from './UserAvatar';
import type { AvatarUser } from './avatar-user';

export interface IUserAvatarStackProps {
  readonly people: readonly {
    readonly user: AvatarUser & { readonly id: string };
    /** Подсказка: «Ревьювер: Иван Петров». */
    readonly title?: string;
  }[];
  readonly max?: number;
  readonly size?: 'sm' | 'xs';
}

/** Стопка аватаров на карточке и в строке доски. */
export function UserAvatarStack({
  people,
  max,
  size = 'xs',
}: IUserAvatarStackProps) {
  return (
    <UIAvatar.Group max={max} size={size}>
      {people.map(({ user, title }) => (
        <UserAvatar
          key={`${user.id}-${title ?? ''}`}
          user={user}
          size={size}
          title={title ?? user.name}
        />
      ))}
    </UIAvatar.Group>
  );
}
