import type { UserBrief } from '@gwmt/contracts';

export type AvatarUser = Pick<UserBrief, 'colorIndex' | 'name'>;
