import type { userSearchQuerySchema } from '@gwmt/contracts';

export type UserSearchQuery = ReturnType<typeof userSearchQuerySchema.parse>;
export type { UserBrief, UserSearchResponse } from '@gwmt/contracts';
