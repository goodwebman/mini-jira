import type { navSummaryQuerySchema } from '@gwmt/contracts';

export type NavSummaryQuery = ReturnType<typeof navSummaryQuerySchema.parse>;
export type { ChangePasswordBody, Me, MyTaskStats, NavSummary, Timezone, UpdateMeBody } from '@gwmt/contracts';
