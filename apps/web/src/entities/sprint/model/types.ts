import type { sprintsQuerySchema } from '@gwmt/contracts';

export type SprintsQuery = Partial<ReturnType<typeof sprintsQuerySchema.parse>>;
export type { SprintBrief, SprintKpi, SprintKpiDay, SprintListItem, SprintListResponse, SprintState } from '@gwmt/contracts';
