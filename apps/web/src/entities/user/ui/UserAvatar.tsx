import { type IUIAvatarProps, UIAvatar } from '@/shared/ui';

import { userTint } from '../model/user-view';
import type { AvatarUser } from './avatar-user';

export interface IUserAvatarProps extends Omit<
  IUIAvatarProps,
  'name' | 'tint'
> {
  readonly user: AvatarUser;
}

export function UserAvatar({ user, ...props }: IUserAvatarProps) {
  return (
    <UIAvatar name={user.name} tint={userTint(user.colorIndex)} {...props} />
  );
}
