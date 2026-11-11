import type { myTasksQuerySchema, taskSearchQuerySchema } from '@gwmt/contracts';

export type MyTasksQuery = Partial<ReturnType<typeof myTasksQuerySchema.parse>>;
export type TaskSearchQuery = Partial<ReturnType<typeof taskSearchQuerySchema.parse>>;
export type {
  BoardTasksResponse, CreateCommentBody, CreateLinkBody, CreateTaskBody,
  MyTasksResponse, TaskCard, TaskComment, TaskDetail, TaskLinkItem, TaskLinkType,
  TaskPriority, TaskRole, TaskRow, TaskSearchItem, TaskSearchResponse, TaskStatus,
  TaskTimer, UpdateTaskBody,
} from '@gwmt/contracts';
