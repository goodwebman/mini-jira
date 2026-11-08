import { UIAvatarGroup } from './UIAvatarGroup';
import { UIAvatarRoot } from './UIAvatarRoot';

export const UIAvatar = Object.assign(UIAvatarRoot, { Group: UIAvatarGroup });

export type { IUIAvatarProps } from './UIAvatarRoot';
export type { IUIAvatarGroupProps } from './UIAvatarGroup';
export { AVATAR_TINTS, getInitials, getTintByName } from './avatar-utils';
export type { UIAvatarTint } from './avatar-utils';
